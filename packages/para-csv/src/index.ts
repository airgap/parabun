// Hardcoded module "para:csv"
//
// Parabun: streaming CSV parser. RFC 4180-ish (comma delimiter, double-quote
// quoting, doubled-quote escaping inside fields). Optional header row,
// optional type inference, custom delimiter / quote / line-ending. Output
// is an async iterator so we never load the whole file into memory.
//
//   import { parseCsv } from "para:csv";
//
//   for await (const row of parseCsv("./big.csv", { headers: true })) {
//     // row is { col1: ..., col2: ... } with inferred types
//   }
//
//   for await (const row of parseCsv(blob, { headers: false })) {
//     // row is ["v1", "v2", ...] — raw strings
//   }
//
//   // Parallel mode — uses para:parallel's worker pool. Materializes the
//   // whole input first (loses streaming) and falls back to serial if the
//   // input contains any quote characters (we'd need a pre-pass to find
//   // safe chunk boundaries, which v1 doesn't do):
//   for await (const row of parseCsv(bigCsv, { parallel: true })) { ... }
//
// Out of scope for v1: Excel dialect quirks, multi-line fields under
// custom record separators, parallel mode for quoted CSVs.

const parallel = require("@para/parallel");

type CsvSource = string | Uint8Array | Blob | ReadableStream<Uint8Array> | AsyncIterable<Uint8Array | string>;

type ParseOptions = {
  /** Field delimiter. Default `,`. Use `\t` for TSV, `|` for pipe-separated. */
  delimiter?: string;
  /** Field quote character. Default `"`. */
  quote?: string;
  /**
   * If `true` (default), the first non-empty row is treated as headers and
   * subsequent rows are emitted as objects keyed by header name. If `false`,
   * every row is emitted as a string array. Pass an explicit array of header
   * names to use them and treat the first data row as data.
   */
  headers?: boolean | string[];
  /**
   * If `true` (default), numeric cells become `number`, "true"/"false" become
   * `boolean`, empty cells become `null`. If `false`, every cell stays a
   * string and the caller does any conversion.
   */
  typeInference?: boolean;
  /**
   * Skip this many leading rows BEFORE header detection. Useful for files
   * with a comment block at the top. Default 0.
   */
  skipLines?: number;
  /**
   * Opt-in parallel chunk parsing via para:parallel's worker pool. Splits
   * the input at line boundaries and parses chunks concurrently. Two
   * caveats:
   *   1. Input is materialized to a single string first (no streaming).
   *   2. Falls back to serial if any quote character appears in the
   *      input — finding safe chunk boundaries inside quoted regions
   *      needs a pre-pass that v1 doesn't do.
   * If both apply, the heuristic is "use parallel for big files of
   * machine-generated data, serial for everything else."
   */
  parallel?: boolean;
};

type ResolvedOptions = Required<Omit<ParseOptions, "headers">> & { headers: ParseOptions["headers"] };

// ─── Decoder layer ─────────────────────────────────────────────────────────
// Normalizes whatever the caller passed into an AsyncIterable<string>. Each
// yielded chunk may end mid-line; the parser handles that.

async function* decodeSource(source: CsvSource): AsyncIterable<string> {
  if (typeof source === "string") {
    yield source;
    return;
  }
  if (source instanceof Uint8Array) {
    yield new TextDecoder("utf-8").decode(source);
    return;
  }
  if (source instanceof Blob) {
    yield* decodeSource(source.stream());
    return;
  }
  // ReadableStream and AsyncIterable both have async-iteration; the
  // ReadableStream branch goes through getReader to be defensive about
  // implementations that don't expose [Symbol.asyncIterator].
  if (typeof (source as ReadableStream).getReader === "function") {
    const reader = (source as ReadableStream<Uint8Array>).getReader();
    const dec = new TextDecoder("utf-8");
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        yield dec.decode(value, { stream: true });
      }
      const tail = dec.decode();
      if (tail.length > 0) yield tail;
    } finally {
      reader.releaseLock();
    }
    return;
  }
  // Generic AsyncIterable — bytes or strings.
  const dec = new TextDecoder("utf-8");
  let sawBytes = false;
  for await (const chunk of source as AsyncIterable<Uint8Array | string>) {
    if (typeof chunk === "string") {
      yield chunk;
    } else {
      sawBytes = true;
      yield dec.decode(chunk, { stream: true });
    }
  }
  if (sawBytes) {
    const tail = dec.decode();
    if (tail.length > 0) yield tail;
  }
}

// ─── Field-level state machine ─────────────────────────────────────────────
// Streams characters through a parser that emits one row at a time. State:
// in-field-unquoted, in-field-quoted, after-quote (waiting for delimiter,
// newline, or doubled-quote). `\r\n` and `\n` are both valid record
// terminators; a `\r` not followed by `\n` is treated as a record terminator
// too (legacy Mac line endings — rare but cheap to handle).
//
// The parser is intentionally allocation-light on the hot path: a single
// growing string buffer for the current field, a single array for the
// current row, both reset (not reallocated) per row.

const enum State {
  FieldStart, // about to read a field — could be quoted or unquoted
  Unquoted, // inside an unquoted field
  Quoted, // inside a quoted field
  AfterQuote, // just saw a closing quote inside a quoted field
}

async function* tokenize(source: CsvSource, delimiter: string, quote: string): AsyncIterable<string[]> {
  if (delimiter.length !== 1) throw new TypeError("para:csv: delimiter must be a single character");
  if (quote.length !== 1) throw new TypeError("para:csv: quote must be a single character");
  const D = delimiter;
  const Q = quote;

  let state: State = State.FieldStart;
  let field = "";
  let row: string[] = [];
  let pendingCR = false; // saw `\r`; next char decides if it's part of CRLF or a lone CR

  for await (const chunk of decodeSource(source)) {
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];

      // Handle a pending CR carried across chunk boundary.
      if (pendingCR) {
        pendingCR = false;
        if (ch === "\n") {
          // CRLF — already terminated the row; just consume the LF.
          continue;
        }
        // Lone CR was already a row terminator; fall through to process this char.
      }

      switch (state) {
        case State.FieldStart: {
          if (ch === Q) {
            state = State.Quoted;
          } else if (ch === D) {
            row.push("");
            // stay in FieldStart for the next field
          } else if (ch === "\n") {
            // empty trailing field — emit the row only if we've started one.
            // A wholly-empty line between rows (CRLF + blank + CRLF) is skipped.
            if (row.length > 0 || field.length > 0) {
              row.push(field);
              yield row;
              row = [];
              field = "";
            }
          } else if (ch === "\r") {
            if (row.length > 0 || field.length > 0) {
              row.push(field);
              yield row;
              row = [];
              field = "";
            }
            pendingCR = true;
          } else {
            field = ch;
            state = State.Unquoted;
          }
          break;
        }
        case State.Unquoted: {
          if (ch === D) {
            row.push(field);
            field = "";
            state = State.FieldStart;
          } else if (ch === "\n") {
            row.push(field);
            yield row;
            row = [];
            field = "";
            state = State.FieldStart;
          } else if (ch === "\r") {
            row.push(field);
            yield row;
            row = [];
            field = "";
            state = State.FieldStart;
            pendingCR = true;
          } else {
            field += ch;
          }
          break;
        }
        case State.Quoted: {
          if (ch === Q) {
            state = State.AfterQuote;
          } else {
            field += ch;
          }
          break;
        }
        case State.AfterQuote: {
          if (ch === Q) {
            // Doubled quote inside a quoted field → literal quote.
            field += Q;
            state = State.Quoted;
          } else if (ch === D) {
            row.push(field);
            field = "";
            state = State.FieldStart;
          } else if (ch === "\n") {
            row.push(field);
            yield row;
            row = [];
            field = "";
            state = State.FieldStart;
          } else if (ch === "\r") {
            row.push(field);
            yield row;
            row = [];
            field = "";
            state = State.FieldStart;
            pendingCR = true;
          } else {
            // Char after closing quote that isn't delimiter / newline. RFC
            // 4180 says this is malformed; we accept it and treat the quote
            // as a literal character within the field (lenient mode).
            field += Q + ch;
            state = State.Unquoted;
          }
          break;
        }
      }
    }
  }

  // Flush the final row if the file didn't end with a newline.
  if (state === State.Quoted) {
    throw new SyntaxError("para:csv: unterminated quoted field at end of input");
  }
  if (row.length > 0 || field.length > 0 || state === State.AfterQuote) {
    row.push(field);
    yield row;
  }
}

// ─── Type inference ────────────────────────────────────────────────────────

function inferCell(s: string): string | number | boolean | null {
  if (s === "") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  // Strict numeric — must round-trip through Number without surprises. We
  // use the regex test first to avoid e.g. "  3 " or "0x10" being treated
  // as numbers, since Number() accepts both but they're rarely intended as
  // numerics in CSV land.
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return s;
}

// ─── Public API ────────────────────────────────────────────────────────────

function resolveOptions(options: ParseOptions): ResolvedOptions {
  return {
    delimiter: options.delimiter ?? ",",
    quote: options.quote ?? '"',
    headers: options.headers ?? true,
    typeInference: options.typeInference ?? true,
    skipLines: options.skipLines ?? 0,
    parallel: options.parallel ?? false,
  };
}

// Below this size, parallel mode's overhead (materialization + worker
// dispatch) outweighs the speedup. Numbers under it stay on the serial
// streaming path.
const PARALLEL_MIN_BYTES = 64 * 1024;

// ─── Parallel chunk parser (no-quote fast path) ────────────────────────────
// This runs INSIDE a worker via para:parallel.pmap. It must be a pure
// function — no closures, no outside references — because pmap stringifies
// it and re-evals on the worker side.
//
// The caller has already verified the input contains zero quote characters,
// so a quoted-field state machine isn't needed. Plain split-on-delimiter
// per line is correct.
//
// Input: { chunk, delimiter } — chunk is a substring split at line
// boundaries (each chunk starts at line N, ends at line M, delimiter is
// the same throughout the input).
// Output: string[][] — one entry per non-empty line in the chunk.
function parseCsvChunkPure(input: { chunk: string; delimiter: string }): string[][] {
  const chunk = input.chunk;
  const d = input.delimiter;
  const rows: string[][] = [];
  let start = 0;
  while (start <= chunk.length) {
    let end = chunk.indexOf("\n", start);
    if (end === -1) end = chunk.length;
    let lineEnd = end;
    if (lineEnd > start && chunk.charCodeAt(lineEnd - 1) === 13) lineEnd--; // strip CR
    if (lineEnd > start) rows.push(chunk.substring(start, lineEnd).split(d));
    start = end + 1;
  }
  return rows;
}

// Split the input into approximately equal chunks at line boundaries.
// Returns chunks that, concatenated, give back the input verbatim — every
// `\n` ends up in the chunk it terminates.
function splitAtLineBoundaries(input: string, n: number): string[] {
  if (n <= 1 || input.length === 0) return [input];
  const chunks: string[] = [];
  const targetSize = Math.floor(input.length / n);
  let start = 0;
  for (let k = 0; k < n - 1; k++) {
    const target = (k + 1) * targetSize;
    const split = input.indexOf("\n", target);
    if (split === -1) {
      // No more newlines after the next target — push the rest as one
      // chunk and stop. Caller may end up with fewer than `n` chunks;
      // that's fine.
      chunks.push(input.substring(start));
      return chunks;
    }
    chunks.push(input.substring(start, split + 1));
    start = split + 1;
  }
  chunks.push(input.substring(start));
  return chunks;
}

function defaultConcurrency(): number {
  // navigator.hardwareConcurrency is available in Bun. Cap at 8 for
  // typical CSV workloads — beyond that, contention on the input string
  // (it's structured-cloned to each worker) eats the speedup.
  // @ts-ignore navigator is available in Bun
  const hc = typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 0;
  return Math.min(typeof hc === "number" && hc > 0 ? hc : 4, 8);
}

async function* parseCsvParallelImpl(
  full: string,
  opts: ResolvedOptions,
): AsyncGenerator<string[] | Record<string, string | number | boolean | null>> {
  const concurrency = defaultConcurrency();
  const chunks = splitAtLineBoundaries(full, concurrency).map(chunk => ({ chunk, delimiter: opts.delimiter }));
  const rowsPerChunk: string[][][] = await parallel.pmap(parseCsvChunkPure, chunks);

  // Apply the same header / type-inference / skipLines logic as the
  // serial path, but flatten across chunks. Chunk order is preserved by
  // pmap (it returns results indexed by input order).
  let skipped = 0;
  let headers: string[] | null = Array.isArray(opts.headers) ? [...opts.headers] : null;
  for (const chunkRows of rowsPerChunk) {
    for (const row of chunkRows) {
      if (skipped < opts.skipLines) {
        skipped++;
        continue;
      }
      if (opts.headers === true && headers === null) {
        headers = row;
        continue;
      }
      if (opts.headers === false) {
        yield opts.typeInference ? (row.map(inferCell) as unknown as string[]) : row;
        continue;
      }
      const obj: Record<string, string | number | boolean | null> = {};
      const hs = headers!;
      for (let i = 0; i < hs.length; i++) {
        const cell = row[i] ?? "";
        obj[hs[i]] = opts.typeInference ? inferCell(cell) : cell;
      }
      yield obj;
    }
  }
}

async function* parseCsvImpl(
  source: CsvSource,
  options: ParseOptions = {},
): AsyncGenerator<string[] | Record<string, string | number | boolean | null>> {
  const opts = resolveOptions(options);

  // Parallel path: materialize the whole input, pre-scan for the quote
  // character, fast-fork to workers if it's safe. Otherwise fall through
  // to the serial state machine using the materialized string as input.
  if (opts.parallel) {
    let full = "";
    for await (const piece of decodeSource(source)) full += piece;
    const safe = full.length >= PARALLEL_MIN_BYTES && !full.includes(opts.quote);
    if (safe) {
      yield* parseCsvParallelImpl(full, opts);
      return;
    }
    source = full; // Hand the materialized string to the serial path.
  }

  const rows = tokenize(source, opts.delimiter, opts.quote);

  let skipped = 0;
  let headers: string[] | null = Array.isArray(opts.headers) ? [...opts.headers] : null;
  // headers === true means: read first non-skipped row as headers
  // headers === false means: emit every row as an array
  // headers === string[] means: use these names, every row is data

  for await (const row of rows) {
    if (skipped < opts.skipLines) {
      skipped++;
      continue;
    }

    if (opts.headers === true && headers === null) {
      headers = row;
      continue;
    }

    if (opts.headers === false) {
      yield opts.typeInference ? (row.map(inferCell) as unknown as string[]) : row;
      continue;
    }

    // headers !== false here, so we have a header array (either user-provided
    // or just-read). Build an object.
    const obj: Record<string, string | number | boolean | null> = {};
    const hs = headers!;
    for (let i = 0; i < hs.length; i++) {
      const cell = row[i] ?? "";
      obj[hs[i]] = opts.typeInference ? inferCell(cell) : cell;
    }
    // Cells beyond the declared header count are dropped silently. This
    // matches pandas' default behavior.
    yield obj;
  }
}

// ── Columnar / typed-array parsing ───────────────────────────────────
//
// parseColumns() streams a CSV directly into per-column typed-array
// buffers — no per-row object allocation, no per-cell value boxing.
// For numeric-heavy CSVs this is O(N) memory in the actual data, vs
// the row-objects path which spends a JS Object header (~56 bytes)
// + boxed Number per cell.
//
//   const cols = await parseColumns("./sensors.csv", {
//     schema: { ts: "f64", value: "f32", sensorId: "i32", label: "string" },
//   });
//   // cols.ts is a Float64Array, cols.value a Float32Array, etc.
//   //   → feed straight into @para/simd / @para/arrow with no copy.
//
// Allocation strategy: each column starts at INITIAL_CAPACITY rows and
// doubles when full (amortized O(N) inserts). At end-of-stream each
// numeric buffer is sliced down to the actual row count via subarray
// — same backing buffer, no copy. String columns are plain Array<string>
// since strings can't share storage in TypedArrays.

type ColumnType = "f32" | "f64" | "i8" | "u8" | "i16" | "u16" | "i32" | "u32" | "string";
type Schema = Record<string, ColumnType>;
type ColumnsResult<S extends Schema> = {
  [K in keyof S]: S[K] extends "string"
    ? string[]
    : S[K] extends "f32"
      ? Float32Array
      : S[K] extends "f64"
        ? Float64Array
        : S[K] extends "i8"
          ? Int8Array
          : S[K] extends "u8"
            ? Uint8Array
            : S[K] extends "i16"
              ? Int16Array
              : S[K] extends "u16"
                ? Uint16Array
                : S[K] extends "i32"
                  ? Int32Array
                  : S[K] extends "u32"
                    ? Uint32Array
                    : never;
};

type ParseColumnsOptions<S extends Schema> = {
  schema: S;
  /** Field delimiter. Default `,`. */
  delimiter?: string;
  /** Field quote character. Default `"`. */
  quote?: string;
  /**
   * `true` (default) — first row is the header row, schema keys are
   * matched against header cells. `false` — schema keys are taken in
   * declaration order against column indices 0, 1, 2, …. Or pass an
   * explicit array of header names.
   */
  headers?: boolean | string[];
};

const TYPED_CTORS: Record<Exclude<ColumnType, "string">, any> = {
  f32: Float32Array,
  f64: Float64Array,
  i8: Int8Array,
  u8: Uint8Array,
  i16: Int16Array,
  u16: Uint16Array,
  i32: Int32Array,
  u32: Uint32Array,
};

const INITIAL_CAPACITY = 1024;

async function parseColumnsImpl<S extends Schema>(
  source: CsvSource,
  options: ParseColumnsOptions<S>,
): Promise<ColumnsResult<S>> {
  const schema = options.schema;
  const colNames = Object.keys(schema);
  const colTypes = colNames.map(n => schema[n]);
  const delimiter = options.delimiter ?? ",";
  const quote = options.quote ?? '"';
  const headersOpt = options.headers ?? true;

  // Map schema column names → CSV column indices. With headers, look
  // up by name; without, indices match schema declaration order.
  const indices = new Array<number>(colNames.length);
  let headerCells: string[] | null = null;

  // Initial buffer set. Numeric columns get a TypedArray; string
  // columns stay as plain arrays (TypedArrays can't hold strings).
  let capacity = INITIAL_CAPACITY;
  let length = 0;
  let buffers: any[] = colNames.map((_, i) => {
    const t = colTypes[i];
    return t === "string" ? ([] as string[]) : new TYPED_CTORS[t](capacity);
  });

  function grow() {
    capacity *= 2;
    for (let i = 0; i < buffers.length; i++) {
      const t = colTypes[i];
      if (t === "string") continue; // Array auto-grows
      const next = new TYPED_CTORS[t](capacity);
      next.set(buffers[i]);
      buffers[i] = next;
    }
  }

  let rowIndex = 0;
  for await (const row of tokenize(source, delimiter, quote)) {
    if (rowIndex === 0 && headersOpt !== false) {
      headerCells = Array.isArray(headersOpt) ? headersOpt : row;
      for (let i = 0; i < colNames.length; i++) {
        const idx = headerCells.indexOf(colNames[i]);
        if (idx < 0) {
          throw new Error(
            `parseColumns: schema column "${colNames[i]}" not found in CSV headers [${headerCells.join(", ")}]`,
          );
        }
        indices[i] = idx;
      }
      // If headers came from a row in the CSV (not the explicit array
      // override), don't write that row into the data buffers.
      if (!Array.isArray(headersOpt)) {
        rowIndex++;
        continue;
      }
    } else if (rowIndex === 0) {
      // headersOpt === false: schema column names map to column index
      // 0..N-1 in declaration order.
      for (let i = 0; i < colNames.length; i++) indices[i] = i;
    }

    if (length === capacity) grow();

    for (let i = 0; i < colNames.length; i++) {
      const cell = row[indices[i]];
      const t = colTypes[i];
      if (t === "string") {
        (buffers[i] as string[])[length] = cell ?? "";
      } else if (t === "f32" || t === "f64") {
        const n = cell === undefined || cell === "" ? NaN : +cell;
        (buffers[i] as Float64Array)[length] = n;
      } else {
        // Integer columns: parseInt with base 10. Empty / non-numeric
        // cells become 0 — caller should validate inputs if 0 is a
        // meaningful sentinel.
        const n = cell === undefined || cell === "" ? 0 : parseInt(cell, 10) | 0;
        (buffers[i] as Int32Array)[length] = n;
      }
    }
    length++;
    rowIndex++;
  }

  // Tight-fit each column. `subarray()` would zero-copy but keeps the
  // doubled ArrayBuffer alive (up to ~50% wasted tail at worst), so
  // allocate a new buffer of the exact length and copy across. One
  // copy per column at end-of-stream beats holding 2× the memory
  // forever for the typical case where the result outlives parsing.
  const result: any = {};
  for (let i = 0; i < colNames.length; i++) {
    const t = colTypes[i];
    if (t === "string") {
      const arr = buffers[i] as string[];
      arr.length = length;
      result[colNames[i]] = arr;
    } else {
      const Ctor = TYPED_CTORS[t];
      const tight = new Ctor(length);
      tight.set((buffers[i] as Float32Array).subarray(0, length));
      result[colNames[i]] = tight;
    }
  }
  return result as ColumnsResult<S>;
}

// ── Streaming RecordBatch + single-pass reduction ────────────────────
//
// parseBatches() yields fixed-size columnar chunks as the parser
// reads rows. Lets a caller process arbitrarily large CSVs in O(N)
// time and O(batchSize) memory without ever materializing the full
// column buffers — the key thing the load-then-compute path can't do.
//
// reduceColumns() is the same pattern with the loop fused: per-column
// running aggregates (sum / min / max / mean / variance / count)
// updated in the parser's row loop, no buffer materialized at all.
// O(1) memory per column. Welford's online algorithm for the
// numerically-stable variance pass.

type BatchResult<S extends Schema> = ColumnsResult<S>;

type ParseBatchesOptions<S extends Schema> = ParseColumnsOptions<S> & {
  /** Rows per emitted batch. Default 8192 — fits comfortably in L2 on
   *  most consumer CPUs after columnwise expansion. */
  batchSize?: number;
};

async function* parseBatchesImpl<S extends Schema>(
  source: CsvSource,
  options: ParseBatchesOptions<S>,
): AsyncIterable<BatchResult<S>> {
  const schema = options.schema;
  const colNames = Object.keys(schema);
  const colTypes = colNames.map(n => schema[n]);
  const delimiter = options.delimiter ?? ",";
  const quote = options.quote ?? '"';
  const headersOpt = options.headers ?? true;
  const batchSize = Math.max(1, options.batchSize ?? 8192);

  const indices = new Array<number>(colNames.length);
  let headerCells: string[] | null = null;
  let headersResolved = false;

  // One full-batch buffer set, reused per emit. After yielding we
  // tight-fit the result if the final batch is short, otherwise we
  // hand the full buffer over and allocate the next batch.
  function makeBatch(rowCount: number) {
    return colNames.map((_, i) => {
      const t = colTypes[i];
      return t === "string" ? new Array<string>(rowCount) : new TYPED_CTORS[t](rowCount);
    });
  }
  let buffers = makeBatch(batchSize);
  let length = 0;

  for await (const row of tokenize(source, delimiter, quote)) {
    if (!headersResolved) {
      if (headersOpt === false) {
        for (let i = 0; i < colNames.length; i++) indices[i] = i;
      } else {
        headerCells = Array.isArray(headersOpt) ? headersOpt : row;
        for (let i = 0; i < colNames.length; i++) {
          const idx = headerCells.indexOf(colNames[i]);
          if (idx < 0) {
            throw new Error(
              `parseBatches: schema column "${colNames[i]}" not found in CSV headers [${headerCells.join(", ")}]`,
            );
          }
          indices[i] = idx;
        }
      }
      headersResolved = true;
      // If headers came from the first row of the source, that row
      // isn't data — skip writing it.
      if (headersOpt !== false && !Array.isArray(headersOpt)) continue;
    }

    for (let i = 0; i < colNames.length; i++) {
      const cell = row[indices[i]];
      const t = colTypes[i];
      if (t === "string") {
        (buffers[i] as string[])[length] = cell ?? "";
      } else if (t === "f32" || t === "f64") {
        (buffers[i] as Float64Array)[length] = cell === undefined || cell === "" ? NaN : +cell;
      } else {
        (buffers[i] as Int32Array)[length] = cell === undefined || cell === "" ? 0 : parseInt(cell, 10) | 0;
      }
    }
    length++;

    if (length === batchSize) {
      const out: any = {};
      for (let i = 0; i < colNames.length; i++) out[colNames[i]] = buffers[i];
      yield out as BatchResult<S>;
      buffers = makeBatch(batchSize);
      length = 0;
    }
  }

  // Flush the final partial batch. Tight-fit instead of yielding the
  // full buffer with trailing junk.
  if (length > 0) {
    const out: any = {};
    for (let i = 0; i < colNames.length; i++) {
      const t = colTypes[i];
      if (t === "string") {
        const arr = buffers[i] as string[];
        arr.length = length;
        out[colNames[i]] = arr;
      } else {
        const Ctor = TYPED_CTORS[t];
        const tight = new Ctor(length);
        tight.set((buffers[i] as Float32Array).subarray(0, length));
        out[colNames[i]] = tight;
      }
    }
    yield out as BatchResult<S>;
  }
}

// ── reduceColumns: stream + reduce in one pass ────────────────────────

type Reducer = "sum" | "min" | "max" | "mean" | "variance" | "stddev" | "count";
type ReduceSpec<S extends Schema> = {
  [K in keyof S]?: readonly Reducer[];
};
type ReduceResult<R extends Reducer> = number;
type ColumnReduceResult<Rs extends readonly Reducer[]> = {
  [K in Rs[number]]: ReduceResult<K>;
};
type ReduceColumnsResult<S extends Schema, R extends ReduceSpec<S>> = {
  [K in keyof R]: R[K] extends readonly Reducer[] ? ColumnReduceResult<R[K]> : never;
};

type ReduceOptions<S extends Schema, R extends ReduceSpec<S>> = {
  schema: S;
  reducers: R;
  headers?: boolean | string[];
  delimiter?: string;
  quote?: string;
};

async function reduceColumnsImpl<S extends Schema, R extends ReduceSpec<S>>(
  source: CsvSource,
  options: ReduceOptions<S, R>,
): Promise<ReduceColumnsResult<S, R>> {
  const schema = options.schema;
  const reducers = options.reducers;
  const colNames = Object.keys(reducers) as (keyof S)[];
  const colTypes = colNames.map(n => schema[n as string]);
  const delimiter = options.delimiter ?? ",";
  const quote = options.quote ?? '"';
  const headersOpt = options.headers ?? true;

  const indices = new Array<number>(colNames.length);
  let headerCells: string[] | null = null;
  let headersResolved = false;

  // Per-column running aggregates. Variance uses Welford for numerical
  // stability over millions of rows.
  type State = { count: number; sum: number; min: number; max: number; mean: number; m2: number };
  const states: State[] = colNames.map(() => ({
    count: 0,
    sum: 0,
    min: Infinity,
    max: -Infinity,
    mean: 0,
    m2: 0,
  }));

  for await (const row of tokenize(source, delimiter, quote)) {
    if (!headersResolved) {
      if (headersOpt === false) {
        for (let i = 0; i < colNames.length; i++) indices[i] = i;
      } else {
        headerCells = Array.isArray(headersOpt) ? headersOpt : row;
        for (let i = 0; i < colNames.length; i++) {
          const name = colNames[i] as string;
          const idx = headerCells.indexOf(name);
          if (idx < 0) {
            throw new Error(`reduceColumns: column "${name}" not found in CSV headers [${headerCells.join(", ")}]`);
          }
          indices[i] = idx;
        }
      }
      headersResolved = true;
      if (headersOpt !== false && !Array.isArray(headersOpt)) continue;
    }

    for (let i = 0; i < colNames.length; i++) {
      const cell = row[indices[i]];
      const t = colTypes[i];
      if (t === "string") {
        // String columns can only meaningfully be `count`-reduced.
        if (cell !== undefined && cell !== "") states[i].count++;
        continue;
      }
      const x = cell === undefined || cell === "" ? NaN : +cell;
      if (Number.isNaN(x)) continue;
      const s = states[i];
      s.count++;
      s.sum += x;
      if (x < s.min) s.min = x;
      if (x > s.max) s.max = x;
      // Welford's online variance update.
      const delta = x - s.mean;
      s.mean += delta / s.count;
      s.m2 += delta * (x - s.mean);
    }
  }

  const result: any = {};
  for (let i = 0; i < colNames.length; i++) {
    const name = colNames[i] as string;
    const s = states[i];
    const wanted = reducers[name as keyof R] as readonly Reducer[];
    const out: any = {};
    for (const r of wanted) {
      switch (r) {
        case "count":
          out.count = s.count;
          break;
        case "sum":
          out.sum = s.sum;
          break;
        case "min":
          out.min = s.count > 0 ? s.min : NaN;
          break;
        case "max":
          out.max = s.count > 0 ? s.max : NaN;
          break;
        case "mean":
          out.mean = s.count > 0 ? s.mean : NaN;
          break;
        case "variance":
          // Sample variance (n-1 divisor). For population variance
          // divide by s.count instead — most stats consumers want
          // sample variance, so that's the default.
          out.variance = s.count > 1 ? s.m2 / (s.count - 1) : NaN;
          break;
        case "stddev":
          out.stddev = s.count > 1 ? Math.sqrt(s.m2 / (s.count - 1)) : NaN;
          break;
      }
    }
    result[name] = out;
  }
  return result as ReduceColumnsResult<S, R>;
}

export default {
  parseCsv: parseCsvImpl,
  parseColumns: parseColumnsImpl,
  parseBatches: parseBatchesImpl,
  reduceColumns: reduceColumnsImpl,
};
