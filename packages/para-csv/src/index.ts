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

export default {
  parseCsv: parseCsvImpl,
};
