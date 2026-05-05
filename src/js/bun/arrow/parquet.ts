// Parquet reader for para:arrow.
//
// Supports the column-oriented Apache Parquet format on read. The slice
// of the spec covered:
//
//   - File framing: PAR1 magic at start + end, length-prefixed Thrift
//     FileMetaData footer, multiple row groups, multiple column chunks.
//   - Physical types: BOOLEAN, INT32, INT64, FLOAT, DOUBLE, BYTE_ARRAY
//     (treated as utf8 by default — coerced to string).
//   - Encodings: PLAIN, PLAIN_DICTIONARY (deprecated alias for
//     RLE_DICTIONARY), RLE_DICTIONARY, RLE (for definition / repetition
//     levels and bit-packed booleans), BIT_PACKED (deprecated, sometimes
//     emitted by older writers).
//   - Compression: UNCOMPRESSED, SNAPPY (handed-rolled inflate — Bun
//     doesn't ship a Snappy decoder), GZIP (via Bun.gunzipSync).
//   - Page formats: V1 data pages (def levels + rep levels + values),
//     dictionary pages.
//   - Schemas: flat, top-level columns. Required and optional. Nested
//     types (List / Map / Struct) read into list-of-structs would need
//     definition / repetition level reconstruction — out of scope for v1.
//
// Hand-rolled Thrift compact protocol decoder; no npm dep on
// `parquetjs` / `thrift`. The schema list is hard-coded against the
// parquet.thrift definitions, not a generic Thrift parser.

interface ColumnLike {
  type: { kind: string };
  length: number;
  values: any;
  validity: Uint8Array | undefined;
  child: ColumnLike | undefined;
  get(i: number): unknown;
}

interface RecordBatchLike {
  schema: { fields: { name: string; type: { kind: string }; nullable: boolean }[] };
  columns: ColumnLike[];
  numRows: number;
  numColumns: number;
  column(name: string): ColumnLike;
}

interface TableLike {
  schema: { fields: { name: string; type: { kind: string }; nullable: boolean }[] };
  batches: RecordBatchLike[];
  numRows: number;
}

type ArrowTypes = {
  Column: new (
    type: { kind: string },
    length: number,
    values: any,
    validity?: Uint8Array,
    child?: ColumnLike,
  ) => ColumnLike;
  RecordBatch: new (
    schema: { fields: { name: string; type: { kind: string }; nullable: boolean }[] },
    columns: ColumnLike[],
    numRows: number,
  ) => RecordBatchLike;
  Table: new (
    schema: { fields: { name: string; type: { kind: string }; nullable: boolean }[] },
    batches: RecordBatchLike[],
  ) => TableLike;
};

let arrowTypes: ArrowTypes | null = null;

export function setArrowTypes(types: ArrowTypes): void {
  arrowTypes = types;
}

function getTypes(): ArrowTypes {
  if (!arrowTypes) {
    throw new Error("para:arrow parquet: arrow.ts must call setArrowTypes() before fromParquet");
  }
  return arrowTypes;
}

// ─── Thrift compact protocol ──────────────────────────────────────────────
// Field header: 1 byte. High nibble = field-id delta, low nibble = type.
// If delta == 0, the absolute field id follows as a zigzag i16.
//
// Element types (compact-protocol numbering):
const TC_STOP = 0;
const TC_BOOL_TRUE = 1;
const TC_BOOL_FALSE = 2;
const TC_BYTE = 3;
const TC_I16 = 4;
const TC_I32 = 5;
const TC_I64 = 6;
const TC_DOUBLE = 7;
const TC_BINARY = 8;
const TC_LIST = 9;
const TC_SET = 10;
const TC_MAP = 11;
const TC_STRUCT = 12;

class ThriftReader {
  buf: Uint8Array;
  view: DataView;
  pos: number;

  constructor(buf: Uint8Array, pos: number = 0) {
    this.buf = buf;
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    this.pos = pos;
  }

  // Unsigned varint.
  readVarint(): number {
    let result = 0;
    let shift = 0;
    while (true) {
      if (this.pos >= this.buf.length) throw new Error("thrift: varint overflowed buffer");
      const b = this.buf[this.pos++];
      result |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) return result >>> 0;
      shift += 7;
      if (shift > 35) throw new Error("thrift: varint > 5 bytes");
    }
  }

  // 64-bit unsigned varint as bigint (used for I64 zigzag).
  readVarint64(): bigint {
    let result = 0n;
    let shift = 0n;
    while (true) {
      if (this.pos >= this.buf.length) throw new Error("thrift: varint64 overflowed buffer");
      const b = BigInt(this.buf[this.pos++]);
      result |= (b & 0x7fn) << shift;
      if ((b & 0x80n) === 0n) return result;
      shift += 7n;
      if (shift > 63n) throw new Error("thrift: varint64 > 10 bytes");
    }
  }

  readZigzagI32(): number {
    const v = this.readVarint();
    return (v >>> 1) ^ -(v & 1);
  }

  readZigzagI64(): bigint {
    const v = this.readVarint64();
    return (v >> 1n) ^ -(v & 1n);
  }

  readByte(): number {
    return this.buf[this.pos++];
  }

  readI8(): number {
    return (this.buf[this.pos++] << 24) >> 24;
  }

  readBinary(): Uint8Array {
    const len = this.readVarint();
    const out = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return out;
  }

  readString(): string {
    return new TextDecoder().decode(this.readBinary());
  }

  // Skip a value of the given type. Used to drop fields we don't care about.
  skip(type: number): void {
    switch (type) {
      case TC_BOOL_TRUE:
      case TC_BOOL_FALSE:
        return;
      case TC_BYTE:
        this.pos += 1;
        return;
      case TC_I16:
      case TC_I32:
        this.readZigzagI32();
        return;
      case TC_I64:
        this.readZigzagI64();
        return;
      case TC_DOUBLE:
        this.pos += 8;
        return;
      case TC_BINARY:
        this.readBinary();
        return;
      case TC_LIST:
      case TC_SET: {
        const head = this.readByte();
        const elementType = head & 0x0f;
        let size = (head >> 4) & 0x0f;
        if (size === 15) size = this.readVarint();
        for (let i = 0; i < size; i++) this.skip(elementType);
        return;
      }
      case TC_MAP: {
        const size = this.readVarint();
        if (size > 0) {
          const kvType = this.readByte();
          const keyType = (kvType >> 4) & 0x0f;
          const valueType = kvType & 0x0f;
          for (let i = 0; i < size; i++) {
            this.skip(keyType);
            this.skip(valueType);
          }
        }
        return;
      }
      case TC_STRUCT:
        this.skipStruct();
        return;
      default:
        throw new Error(`thrift: cannot skip type ${type}`);
    }
  }

  skipStruct(): void {
    let lastFieldId = 0;
    while (true) {
      const head = this.readByte();
      const type = head & 0x0f;
      if (type === TC_STOP) return;
      const delta = (head >> 4) & 0x0f;
      const fieldId = delta === 0 ? this.readZigzagI32() : lastFieldId + delta;
      lastFieldId = fieldId;
      this.skip(type);
    }
  }

  // Read fields until STOP, dispatching to the caller-provided handler.
  // Handler returns true if it consumed the field, false to skip.
  readStruct(handler: (fieldId: number, type: number, r: ThriftReader) => boolean): void {
    let lastFieldId = 0;
    while (true) {
      const head = this.readByte();
      const type = head & 0x0f;
      if (type === TC_STOP) return;
      const delta = (head >> 4) & 0x0f;
      const fieldId = delta === 0 ? this.readZigzagI32() : lastFieldId + delta;
      lastFieldId = fieldId;
      if (!handler(fieldId, type, this)) this.skip(type);
    }
  }

  // List header: type + size.
  readListHeader(): { elementType: number; size: number } {
    const head = this.readByte();
    const elementType = head & 0x0f;
    let size = (head >> 4) & 0x0f;
    if (size === 15) size = this.readVarint();
    return { elementType, size };
  }
}

// ─── Parquet thrift schema (subset we actually parse) ─────────────────────

// Type enum (parquet.thrift)
const PQ_TYPE_BOOLEAN = 0;
const PQ_TYPE_INT32 = 1;
const PQ_TYPE_INT64 = 2;
const PQ_TYPE_INT96 = 3;
const PQ_TYPE_FLOAT = 4;
const PQ_TYPE_DOUBLE = 5;
const PQ_TYPE_BYTE_ARRAY = 6;
const PQ_TYPE_FIXED_LEN_BYTE_ARRAY = 7;

// FieldRepetitionType
const PQ_REP_REQUIRED = 0;
const PQ_REP_OPTIONAL = 1;
const PQ_REP_REPEATED = 2;

// ConvertedType (legacy logical-type mapping)
const PQ_CT_UTF8 = 0;

// CompressionCodec
const PQ_CODEC_UNCOMPRESSED = 0;
const PQ_CODEC_SNAPPY = 1;
const PQ_CODEC_GZIP = 2;
// Codes 3 (LZO) / 4 (BROTLI) / 5 (LZ4 legacy) / 7 (LZ4_RAW) are not
// supported — Bun doesn't ship the corresponding decoders. Anything
// emitted as those falls into the explicit "not supported" branch
// below with a clear message rather than silently producing garbage.
const PQ_CODEC_ZSTD = 6;

// ─── Split-Block Bloom Filter (SBBF) ──────────────────────────────────────
//
// Per parquet.thrift's BloomFilter spec. Each filter is a sequence of
// 32-byte blocks (= 8 little-endian uint32s = 256 bits). Insert hashes
// the value with XxHash64 (seed=0); the high 32 bits select a block,
// the low 32 bits drive 8 salted bit-sets within the block.
//
// Hash flavors / algorithms / compressions are fixed in practice: every
// reader supports SBLOCK + XXHASH + UNCOMPRESSED. The Thrift union
// encoding is the only thing wider.

// Spec-defined salts used by the per-block bit selection.
const SBBF_SALT = new Uint32Array([
  0x47b6137b, 0x44974d91, 0x8824ad5b, 0xa2b7289d, 0x705495c7, 0x2df1424b, 0x9efc4947, 0x5c6bfb31,
]);

const SBBF_BLOCK_BYTES = 32;

// Insert one 64-bit hash into `blocks` (Uint32Array of length numBlocks*8).
function sbbfInsert(blocks: Uint32Array, numBlocks: number, hash: bigint): void {
  // Block index: high 32 bits × numBlocks, take high 32 bits.
  const hi = Number(hash >> 32n) >>> 0;
  const lo = Number(hash & 0xffffffffn) >>> 0;
  // (hi * numBlocks) >>> 32 — use BigInt to avoid losing precision when
  // hi*numBlocks overflows 53 bits.
  const blockIdx = Number((BigInt(hi) * BigInt(numBlocks)) >> 32n);
  const base = blockIdx * 8;
  for (let i = 0; i < 8; i++) {
    // Math.imul handles 32-bit signed multiply with low-32 truncation.
    const masked = Math.imul(lo, SBBF_SALT[i] | 0) >>> 0;
    const bit = masked >>> 27;
    blocks[base + i] |= 1 << bit;
  }
}

// Same shape as insert; returns false iff any bit we'd have set is
// missing → the value is *definitely not* present.
function sbbfMightContain(blocks: Uint32Array, numBlocks: number, hash: bigint): boolean {
  const hi = Number(hash >> 32n) >>> 0;
  const lo = Number(hash & 0xffffffffn) >>> 0;
  const blockIdx = Number((BigInt(hi) * BigInt(numBlocks)) >> 32n);
  const base = blockIdx * 8;
  for (let i = 0; i < 8; i++) {
    const masked = Math.imul(lo, SBBF_SALT[i] | 0) >>> 0;
    const bit = masked >>> 27;
    if ((blocks[base + i] & (1 << bit)) === 0) return false;
  }
  return true;
}

// Hash an arbitrary parquet value to its XxHash64 digest using the
// PLAIN-encoded bytes the spec mandates. Supported types match the
// parquet bloom-filter spec (INT96 is intentionally excluded — the spec
// disallows it because the canonical 12-byte representation is
// implementation-defined).
function bloomHashValue(value: any, physicalType: number, typeLength?: number): bigint {
  switch (physicalType) {
    case PQ_TYPE_BOOLEAN: {
      const b = new Uint8Array(1);
      b[0] = value ? 1 : 0;
      return Bun.hash.xxHash64(b);
    }
    case PQ_TYPE_INT32: {
      const b = new Uint8Array(4);
      new DataView(b.buffer).setInt32(0, value | 0, true);
      return Bun.hash.xxHash64(b);
    }
    case PQ_TYPE_INT64: {
      const b = new Uint8Array(8);
      new DataView(b.buffer).setBigInt64(0, BigInt(value), true);
      return Bun.hash.xxHash64(b);
    }
    case PQ_TYPE_FLOAT: {
      const b = new Uint8Array(4);
      new DataView(b.buffer).setFloat32(0, +value, true);
      return Bun.hash.xxHash64(b);
    }
    case PQ_TYPE_DOUBLE: {
      const b = new Uint8Array(8);
      new DataView(b.buffer).setFloat64(0, +value, true);
      return Bun.hash.xxHash64(b);
    }
    case PQ_TYPE_BYTE_ARRAY: {
      // PLAIN form for BYTE_ARRAY in bloom-filter context is the raw
      // bytes (no length prefix). Strings use UTF-8.
      const bytes = typeof value === "string" ? new TextEncoder().encode(value) : (value as Uint8Array);
      return Bun.hash.xxHash64(bytes);
    }
    case PQ_TYPE_FIXED_LEN_BYTE_ARRAY: {
      const bytes = value as Uint8Array;
      if (typeLength !== undefined && bytes.length !== typeLength) {
        throw new RangeError(
          `parquet bloom filter: FLBA value length ${bytes.length} ≠ expected typeLength ${typeLength}`,
        );
      }
      return Bun.hash.xxHash64(bytes);
    }
    default:
      throw new Error(`parquet bloom filter: physical type ${physicalType} not supported`);
  }
}

// Build a fresh SBBF bitmap from a values iterable. `numBytes` is
// rounded up to a 32-byte multiple. Picks ~32 KB per filter by default
// (~10⁵ NDV at ~1% FPR).
function buildSbbf(
  values: any,
  numNonNull: number,
  physicalType: number,
  typeLength?: number,
  numBytesHint?: number,
): Uint8Array {
  const numBytes = Math.max(SBBF_BLOCK_BYTES, alignTo(numBytesHint ?? 32 * 1024, SBBF_BLOCK_BYTES));
  const numBlocks = numBytes / SBBF_BLOCK_BYTES;
  const blocks = new Uint32Array(numBlocks * 8);
  if (physicalType === PQ_TYPE_FIXED_LEN_BYTE_ARRAY) {
    // FLBA values is one big Uint8Array of width-byte windows.
    const w = typeLength!;
    for (let i = 0; i < numNonNull; i++) {
      const slice = (values as Uint8Array).subarray(i * w, (i + 1) * w);
      sbbfInsert(blocks, numBlocks, bloomHashValue(slice, physicalType, typeLength));
    }
  } else {
    for (let i = 0; i < numNonNull; i++) {
      sbbfInsert(blocks, numBlocks, bloomHashValue(values[i], physicalType, typeLength));
    }
  }
  return new Uint8Array(blocks.buffer, 0, numBytes);
}

function alignTo(n: number, mult: number): number {
  return Math.ceil(n / mult) * mult;
}

// Decode a BloomFilterHeader thrift struct at the current reader
// position. We only emit / accept the canonical SBLOCK + XXHASH +
// UNCOMPRESSED variants — every other writer + reader in the wild
// uses these too.
function parseBloomFilterHeader(r: ThriftReader): { numBytes: number } {
  let numBytes = 0;
  r.readStruct((fid, _t, rr) => {
    switch (fid) {
      case 1:
        numBytes = rr.readZigzagI32();
        return true;
      case 2: // algorithm (SplitBlockAlgorithm) — single empty inner struct, skip body.
      case 3: // hash      (XxHash)              — same.
      case 4: // compression (Uncompressed)      — same.
        rr.skip(TC_STRUCT);
        return true;
    }
    return false;
  });
  return { numBytes };
}

// ConvertedType — pre-2.4 logical-type annotation (PQ_CT_UTF8 declared
// up by the type constants above). Every parquet reader since 2.0
// understands these; the newer LogicalType union is more expressive
// but not yet wired here. Date / timestamp columns round-trip via the
// ConvertedType field only for now.
const PQ_CT_LIST = 3;
const PQ_CT_DECIMAL = 5;
const PQ_CT_DATE = 6;
const PQ_CT_TIMESTAMP_MILLIS = 9;
const PQ_CT_TIMESTAMP_MICROS = 10;

// PageType
const PQ_PAGE_DATA_PAGE = 0;
const PQ_PAGE_INDEX_PAGE = 1;
const PQ_PAGE_DICTIONARY_PAGE = 2;
const PQ_PAGE_DATA_PAGE_V2 = 3;

// Encoding
const PQ_ENC_PLAIN = 0;
const PQ_ENC_PLAIN_DICTIONARY = 2;
const PQ_ENC_RLE = 3;
const PQ_ENC_BIT_PACKED = 4;
const PQ_ENC_DELTA_BINARY_PACKED = 5;
const PQ_ENC_DELTA_LENGTH_BYTE_ARRAY = 6;
const PQ_ENC_DELTA_BYTE_ARRAY = 7;
const PQ_ENC_RLE_DICTIONARY = 8;

interface SchemaElement {
  type: number | undefined; // physical type — undefined for group nodes
  typeLength: number | undefined;
  repetitionType: number; // defaults to required at the root
  name: string;
  numChildren: number; // 0 for leaf
  convertedType: number | undefined;
  // Decimal-only: total digit count (precision) and digits-after-decimal-
  // point (scale). Both undefined for non-decimal columns.
  scale: number | undefined;
  precision: number | undefined;
}

interface ColumnStatistics {
  /** PLAIN-encoded bytes of the maximum value in the chunk; absent → unknown. */
  maxValue: Uint8Array | undefined;
  /** PLAIN-encoded bytes of the minimum value in the chunk; absent → unknown. */
  minValue: Uint8Array | undefined;
  /** Count of nulls in the chunk; absent → unknown (treat as ≥0). */
  nullCount: bigint | undefined;
  /** Count of distinct values; absent → unknown. We don't compute this. */
  distinctCount: bigint | undefined;
}

interface ColumnMetaData {
  type: number;
  encodings: number[];
  pathInSchema: string[];
  codec: number;
  numValues: bigint;
  dataPageOffset: bigint;
  dictionaryPageOffset: bigint | undefined;
  /**
   * Per-column-chunk min/max + null-count. Populated by writers that
   * compute them (we do; older parquet emitters often don't). Downstream
   * readers — DuckDB, Polars, pyarrow — use these for predicate
   * pushdown: a row group whose [min, max] doesn't overlap the filter
   * predicate is skipped without reading the data pages.
   */
  statistics: ColumnStatistics | undefined;
  /**
   * Bloom filter offset in the parquet file (field 14 in the
   * thrift). Optional — undefined means no bloom filter for this
   * column. Used by `readBloomFilters()` for fast "definitely not
   * present" lookups before fully decoding a row group.
   */
  bloomFilterOffset: bigint | undefined;
  /**
   * Length of the bloom-filter region (header + bitmap), or
   * undefined for older writers that didn't emit field 15. We can
   * also derive this from the header's numBytes, so absence is
   * recoverable.
   */
  bloomFilterLength: number | undefined;
}

interface ColumnChunk {
  fileOffset: bigint;
  metaData: ColumnMetaData;
}

interface RowGroup {
  columns: ColumnChunk[];
  numRows: bigint;
}

interface FileMetaData {
  version: number;
  schema: SchemaElement[];
  numRows: bigint;
  rowGroups: RowGroup[];
}

function parseSchemaElement(r: ThriftReader): SchemaElement {
  const out: SchemaElement = {
    type: undefined,
    typeLength: undefined,
    repetitionType: PQ_REP_REQUIRED,
    name: "",
    numChildren: 0,
    convertedType: undefined,
    scale: undefined,
    precision: undefined,
  };
  r.readStruct((fid, t, rr) => {
    switch (fid) {
      case 1:
        out.type = rr.readZigzagI32();
        return true;
      case 2:
        out.typeLength = rr.readZigzagI32();
        return true;
      case 3:
        out.repetitionType = rr.readZigzagI32();
        return true;
      case 4:
        out.name = rr.readString();
        return true;
      case 5:
        out.numChildren = rr.readZigzagI32();
        return true;
      case 9:
        out.scale = rr.readZigzagI32();
        return true;
      case 10:
        out.precision = rr.readZigzagI32();
        return true;
      case 6:
        out.convertedType = rr.readZigzagI32();
        return true;
    }
    return false;
  });
  return out;
}

// Per parquet.thrift Statistics:
//   1: optional binary max          (deprecated, signed-comparison-ambiguous)
//   2: optional binary min          (deprecated)
//   3: optional i64    null_count
//   4: optional i64    distinct_count
//   5: optional binary max_value    (preferred — well-defined comparison)
//   6: optional binary min_value    (preferred)
//   7: optional bool   is_max_value_exact
//   8: optional bool   is_min_value_exact
// We read both max/min and max_value/min_value; the v5/v6 pair is
// preferred when both are present (newer writers). null_count is the
// most-used field by downstream filters.
function parseStatistics(r: ThriftReader): ColumnStatistics {
  const out: ColumnStatistics = {
    maxValue: undefined,
    minValue: undefined,
    nullCount: undefined,
    distinctCount: undefined,
  };
  // Older v1/v2 fall back; newer v5/v6 win if seen later in the same
  // struct (Thrift fields can come in any order, so capture both).
  let legacyMax: Uint8Array | undefined;
  let legacyMin: Uint8Array | undefined;
  r.readStruct((fid, _t, rr) => {
    switch (fid) {
      case 1:
        legacyMax = rr.readBinary();
        return true;
      case 2:
        legacyMin = rr.readBinary();
        return true;
      case 3:
        out.nullCount = rr.readZigzagI64();
        return true;
      case 4:
        out.distinctCount = rr.readZigzagI64();
        return true;
      case 5:
        out.maxValue = rr.readBinary();
        return true;
      case 6:
        out.minValue = rr.readBinary();
        return true;
    }
    return false;
  });
  if (out.maxValue === undefined) out.maxValue = legacyMax;
  if (out.minValue === undefined) out.minValue = legacyMin;
  return out;
}

function parseColumnMetaData(r: ThriftReader): ColumnMetaData {
  const out: ColumnMetaData = {
    type: PQ_TYPE_INT32,
    encodings: [],
    pathInSchema: [],
    codec: PQ_CODEC_UNCOMPRESSED,
    numValues: 0n,
    dataPageOffset: 0n,
    dictionaryPageOffset: undefined,
    statistics: undefined,
    bloomFilterOffset: undefined,
    bloomFilterLength: undefined,
  };
  r.readStruct((fid, t, rr) => {
    switch (fid) {
      case 1:
        out.type = rr.readZigzagI32();
        return true;
      case 2: {
        const { size } = rr.readListHeader();
        for (let i = 0; i < size; i++) out.encodings.push(rr.readZigzagI32());
        return true;
      }
      case 3: {
        const { size } = rr.readListHeader();
        for (let i = 0; i < size; i++) out.pathInSchema.push(rr.readString());
        return true;
      }
      case 4:
        out.codec = rr.readZigzagI32();
        return true;
      case 5:
        out.numValues = rr.readZigzagI64();
        return true;
      case 9:
        out.dataPageOffset = rr.readZigzagI64();
        return true;
      case 11:
        out.dictionaryPageOffset = rr.readZigzagI64();
        return true;
      case 12:
        out.statistics = parseStatistics(rr);
        return true;
      case 14:
        // bloom_filter_offset — i64 file offset of the
        // BloomFilterHeader. The bitmap follows immediately.
        out.bloomFilterOffset = rr.readZigzagI64();
        return true;
      case 15:
        // bloom_filter_length — total byte length of the bloom
        // filter region (header + bitmap). Optional; recoverable
        // from the header's numBytes when absent.
        out.bloomFilterLength = rr.readZigzagI32();
        return true;
    }
    return false;
  });
  return out;
}

function parseColumnChunk(r: ThriftReader): ColumnChunk {
  let fileOffset = 0n;
  let metaData: ColumnMetaData | undefined;
  r.readStruct((fid, t, rr) => {
    switch (fid) {
      case 2:
        fileOffset = rr.readZigzagI64();
        return true;
      case 3:
        metaData = parseColumnMetaData(rr);
        return true;
    }
    return false;
  });
  if (!metaData) throw new Error("parquet: ColumnChunk has no inline meta_data — file_path indirection not supported");
  return { fileOffset, metaData };
}

function parseRowGroup(r: ThriftReader): RowGroup {
  const out: RowGroup = { columns: [], numRows: 0n };
  r.readStruct((fid, t, rr) => {
    switch (fid) {
      case 1: {
        const { size } = rr.readListHeader();
        for (let i = 0; i < size; i++) out.columns.push(parseColumnChunk(rr));
        return true;
      }
      case 3:
        out.numRows = rr.readZigzagI64();
        return true;
    }
    return false;
  });
  return out;
}

function parseFileMetaData(r: ThriftReader): FileMetaData {
  const out: FileMetaData = { version: 0, schema: [], numRows: 0n, rowGroups: [] };
  r.readStruct((fid, t, rr) => {
    switch (fid) {
      case 1:
        out.version = rr.readZigzagI32();
        return true;
      case 2: {
        const { size } = rr.readListHeader();
        for (let i = 0; i < size; i++) out.schema.push(parseSchemaElement(rr));
        return true;
      }
      case 3:
        out.numRows = rr.readZigzagI64();
        return true;
      case 4: {
        const { size } = rr.readListHeader();
        for (let i = 0; i < size; i++) out.rowGroups.push(parseRowGroup(rr));
        return true;
      }
    }
    return false;
  });
  return out;
}

// ─── Page header (Thrift) ─────────────────────────────────────────────────

interface DataPageHeader {
  numValues: number;
  encoding: number;
  defLevelEncoding: number;
  repLevelEncoding: number;
}

interface DictionaryPageHeader {
  numValues: number;
  encoding: number;
}

interface DataPageHeaderV2 {
  numValues: number;
  numNulls: number;
  numRows: number;
  encoding: number;
  defLevelsByteLength: number;
  repLevelsByteLength: number;
  isCompressed: boolean;
}

interface PageHeader {
  type: number;
  uncompressedSize: number;
  compressedSize: number;
  dataPageHeader: DataPageHeader | undefined;
  dataPageHeaderV2: DataPageHeaderV2 | undefined;
  dictionaryPageHeader: DictionaryPageHeader | undefined;
}

function parseDataPageHeader(r: ThriftReader): DataPageHeader {
  const out: DataPageHeader = {
    numValues: 0,
    encoding: PQ_ENC_PLAIN,
    defLevelEncoding: PQ_ENC_RLE,
    repLevelEncoding: PQ_ENC_RLE,
  };
  r.readStruct((fid, t, rr) => {
    switch (fid) {
      case 1:
        out.numValues = rr.readZigzagI32();
        return true;
      case 2:
        out.encoding = rr.readZigzagI32();
        return true;
      case 3:
        out.defLevelEncoding = rr.readZigzagI32();
        return true;
      case 4:
        out.repLevelEncoding = rr.readZigzagI32();
        return true;
    }
    return false;
  });
  return out;
}

function parseDictionaryPageHeader(r: ThriftReader): DictionaryPageHeader {
  const out: DictionaryPageHeader = { numValues: 0, encoding: PQ_ENC_PLAIN };
  r.readStruct((fid, t, rr) => {
    switch (fid) {
      case 1:
        out.numValues = rr.readZigzagI32();
        return true;
      case 2:
        out.encoding = rr.readZigzagI32();
        return true;
    }
    return false;
  });
  return out;
}

// DataPageHeaderV2 — newer page layout used by recent pyarrow / Polars /
// Spark writers. Differences from V1: def/rep levels are NEVER compressed
// (only the values payload is, when is_compressed is true), and the
// header carries explicit byte lengths for both level streams so the
// reader doesn't have to length-decode them. Field ids per
// parquet.thrift @ 2.10:
//   1 numValues 2 numNulls 3 numRows 4 encoding (values)
//   5 defLevelsByteLength 6 repLevelsByteLength
//   7 isCompressed (default true) 8 statistics (skipped — not needed
//   for materialization)
function parseDataPageHeaderV2(r: ThriftReader): DataPageHeaderV2 {
  const out: DataPageHeaderV2 = {
    numValues: 0,
    numNulls: 0,
    numRows: 0,
    encoding: PQ_ENC_PLAIN,
    defLevelsByteLength: 0,
    repLevelsByteLength: 0,
    isCompressed: true,
  };
  r.readStruct((fid, t, rr) => {
    switch (fid) {
      case 1:
        out.numValues = rr.readZigzagI32();
        return true;
      case 2:
        out.numNulls = rr.readZigzagI32();
        return true;
      case 3:
        out.numRows = rr.readZigzagI32();
        return true;
      case 4:
        out.encoding = rr.readZigzagI32();
        return true;
      case 5:
        out.defLevelsByteLength = rr.readZigzagI32();
        return true;
      case 6:
        out.repLevelsByteLength = rr.readZigzagI32();
        return true;
      case 7:
        // Thrift compact bool fields encode the value in the type
        // tag itself: TC_BOOL_TRUE means true, TC_BOOL_FALSE means
        // false. No separate value byte to consume.
        out.isCompressed = t === TC_BOOL_TRUE;
        return true;
    }
    return false;
  });
  return out;
}

function parsePageHeader(r: ThriftReader): PageHeader {
  const out: PageHeader = {
    type: PQ_PAGE_DATA_PAGE,
    uncompressedSize: 0,
    compressedSize: 0,
    dataPageHeader: undefined,
    dataPageHeaderV2: undefined,
    dictionaryPageHeader: undefined,
  };
  r.readStruct((fid, t, rr) => {
    switch (fid) {
      case 1:
        out.type = rr.readZigzagI32();
        return true;
      case 2:
        out.uncompressedSize = rr.readZigzagI32();
        return true;
      case 3:
        out.compressedSize = rr.readZigzagI32();
        return true;
      case 5:
        out.dataPageHeader = parseDataPageHeader(rr);
        return true;
      case 7:
        out.dictionaryPageHeader = parseDictionaryPageHeader(rr);
        return true;
      case 8:
        out.dataPageHeaderV2 = parseDataPageHeaderV2(rr);
        // V2 reuses the page-type constant PQ_PAGE_DATA_PAGE_V2 — set
        // it explicitly here in case the writer emitted the type field
        // out of order vs the V2 sub-struct (Thrift doesn't guarantee
        // field order across writers).
        out.type = PQ_PAGE_DATA_PAGE_V2;
        return true;
    }
    return false;
  });
  return out;
}

// ─── Snappy decompression ─────────────────────────────────────────────────
// Snappy is the parquet default for compression=snappy. The format spec is
// short; reference: github.com/google/snappy/blob/master/format_description.txt
//
// File starts with a varint giving the uncompressed length. Then a sequence
// of tag+payload entries. Tag's low 2 bits select the entry type:
//   00 - literal: length minus one in upper 6 bits (or extra bytes)
//   01 - copy with 1-byte offset (small): offset is 11 bits, length is 4..11
//   10 - copy with 2-byte offset: offset 16-bit, length is 1..64
//   11 - copy with 4-byte offset (rare): offset 32-bit, length is 1..64

function snappyDecompress(input: Uint8Array): Uint8Array {
  let inPos = 0;

  // Uncompressed length (varint).
  let outLen = 0;
  let shift = 0;
  while (true) {
    const b = input[inPos++];
    outLen |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }

  const out = new Uint8Array(outLen);
  let outPos = 0;
  while (inPos < input.length) {
    const tag = input[inPos++];
    const tagType = tag & 0x03;
    if (tagType === 0) {
      // Literal
      let len = (tag >> 2) + 1;
      if (len >= 61) {
        const extra = len - 60;
        let extraVal = 0;
        for (let i = 0; i < extra; i++) extraVal |= input[inPos + i] << (8 * i);
        inPos += extra;
        len = extraVal + 1;
      }
      out.set(input.subarray(inPos, inPos + len), outPos);
      inPos += len;
      outPos += len;
    } else {
      // Copy from previous output.
      let offset: number;
      let len: number;
      if (tagType === 1) {
        len = ((tag >> 2) & 0x07) + 4;
        offset = ((tag & 0xe0) << 3) | input[inPos++];
      } else if (tagType === 2) {
        len = (tag >> 2) + 1;
        offset = input[inPos] | (input[inPos + 1] << 8);
        inPos += 2;
      } else {
        len = (tag >> 2) + 1;
        offset = (input[inPos] | (input[inPos + 1] << 8) | (input[inPos + 2] << 16) | (input[inPos + 3] << 24)) >>> 0;
        inPos += 4;
      }
      if (offset === 0 || offset > outPos) throw new Error(`snappy: invalid offset ${offset} at ${outPos}`);
      // The copy can overlap: each byte may be read from a position that
      // gets written by an earlier byte of the same copy. Byte-by-byte
      // is simplest and matches reference behavior.
      const start = outPos - offset;
      for (let i = 0; i < len; i++) out[outPos + i] = out[start + i];
      outPos += len;
    }
  }
  if (outPos !== outLen) throw new Error(`snappy: output length mismatch (got ${outPos}, expected ${outLen})`);
  return out;
}

// ─── RLE / bit-pack hybrid decoder ────────────────────────────────────────
// The hybrid layout used by Parquet for definition levels, repetition
// levels, and dictionary indices. Repeated runs of (header, body) where
// the header is a varint:
//   header & 1 == 0 → RLE run: header >> 1 == repeat count, body is one
//                     bit-width-bytes integer, value repeated.
//   header & 1 == 1 → bit-packed run: header >> 1 == number of groups of
//                     8 values, body is groups*8*bitWidth bits packed LE.
//
// `bitWidth` is the width of each value in bits (ceil(log2(maxValue + 1))).

function decodeHybridRleBitPack(
  input: Uint8Array,
  inputOffset: number,
  inputEnd: number,
  bitWidth: number,
  count: number,
  out: Int32Array,
): number {
  if (bitWidth === 0) {
    out.fill(0, 0, count);
    return inputOffset;
  }
  const byteWidth = Math.ceil(bitWidth / 8);
  let pos = inputOffset;
  let written = 0;
  while (written < count && pos < inputEnd) {
    // Varint header.
    let header = 0;
    let shift = 0;
    while (true) {
      const b = input[pos++];
      header |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    if ((header & 1) === 0) {
      const runLen = header >>> 1;
      let value = 0;
      for (let i = 0; i < byteWidth; i++) value |= input[pos + i] << (8 * i);
      pos += byteWidth;
      const end = Math.min(written + runLen, count);
      for (let i = written; i < end; i++) out[i] = value;
      written = end;
    } else {
      const numGroups = header >>> 1;
      const bytesNeeded = numGroups * bitWidth; // groups × 8 values × bitWidth / 8 = groups × bitWidth bytes
      let bitBuf = 0;
      let bitsInBuf = 0;
      const mask = (1 << bitWidth) - 1;
      for (let g = 0; g < numGroups && written < count; g++) {
        // Process 8 values per group.
        for (let i = 0; i < 8; i++) {
          while (bitsInBuf < bitWidth) {
            bitBuf |= input[pos++] << bitsInBuf;
            bitsInBuf += 8;
          }
          const v = bitBuf & mask;
          bitBuf >>>= bitWidth;
          bitsInBuf -= bitWidth;
          if (written < count) {
            out[written++] = v;
          }
        }
      }
      // We may have over-counted bytes if count < 8 * numGroups; that's
      // fine — the writer rounds up to whole groups.
      void bytesNeeded;
    }
  }
  return pos;
}

// ─── Page decoding ────────────────────────────────────────────────────────

function decompressPage(input: Uint8Array, codec: number, expectedLen: number): Uint8Array {
  if (codec === PQ_CODEC_UNCOMPRESSED) return input;
  if (codec === PQ_CODEC_SNAPPY) {
    const out = snappyDecompress(input);
    if (out.length !== expectedLen) {
      throw new Error(`parquet: snappy length mismatch (got ${out.length}, expected ${expectedLen})`);
    }
    return out;
  }
  if (codec === PQ_CODEC_GZIP) {
    const out = (Bun as any).gunzipSync(input) as Uint8Array;
    if (out.length !== expectedLen) {
      throw new Error(`parquet: gzip length mismatch (got ${out.length}, expected ${expectedLen})`);
    }
    return out;
  }
  if (codec === PQ_CODEC_ZSTD) {
    const out = (Bun as any).zstdDecompressSync(input) as Uint8Array;
    if (out.length !== expectedLen) {
      throw new Error(`parquet: zstd length mismatch (got ${out.length}, expected ${expectedLen})`);
    }
    return out;
  }
  throw new Error(
    `parquet: compression codec ${codec} not supported (UNCOMPRESSED, SNAPPY, GZIP, ZSTD supported; LZO/BROTLI/LZ4 not — Bun doesn't ship the decoder)`,
  );
}

// PLAIN encoding for a typed values array. Returns a typed array suitable
// for insertion into a Column.
function decodePlainTyped(
  data: Uint8Array,
  offset: number,
  numValues: number,
  type: number,
  typeLength?: number,
): { values: any; consumed: number } {
  const view = new DataView(data.buffer, data.byteOffset + offset, data.byteLength - offset);
  switch (type) {
    case PQ_TYPE_INT32: {
      const arr = new Int32Array(numValues);
      for (let i = 0; i < numValues; i++) arr[i] = view.getInt32(i * 4, true);
      return { values: arr, consumed: numValues * 4 };
    }
    case PQ_TYPE_INT64: {
      const arr = new BigInt64Array(numValues);
      for (let i = 0; i < numValues; i++) arr[i] = view.getBigInt64(i * 8, true);
      return { values: arr, consumed: numValues * 8 };
    }
    case PQ_TYPE_INT96: {
      // 12 bytes per value: 8 bytes nanos-of-day (uint64 LE) +
      // 4 bytes Julian Day (uint32 LE). Convert to nanoseconds since
      // Unix epoch as a signed BigInt. JD 2440588 = 1970-01-01.
      const arr = new BigInt64Array(numValues);
      const NANOS_PER_DAY = 86_400_000_000_000n;
      for (let i = 0; i < numValues; i++) {
        const nanosOfDay = view.getBigUint64(i * 12, true);
        const julianDay = view.getUint32(i * 12 + 8, true);
        const unixDays = BigInt(julianDay) - 2440588n;
        arr[i] = unixDays * NANOS_PER_DAY + BigInt.asIntN(64, nanosOfDay);
      }
      return { values: arr, consumed: numValues * 12 };
    }
    case PQ_TYPE_FLOAT: {
      const arr = new Float32Array(numValues);
      for (let i = 0; i < numValues; i++) arr[i] = view.getFloat32(i * 4, true);
      return { values: arr, consumed: numValues * 4 };
    }
    case PQ_TYPE_DOUBLE: {
      const arr = new Float64Array(numValues);
      for (let i = 0; i < numValues; i++) arr[i] = view.getFloat64(i * 8, true);
      return { values: arr, consumed: numValues * 8 };
    }
    case PQ_TYPE_BYTE_ARRAY: {
      const arr: string[] = new Array(numValues);
      const decoder = new TextDecoder();
      let p = 0;
      for (let i = 0; i < numValues; i++) {
        const len = view.getInt32(p, true);
        p += 4;
        arr[i] = decoder.decode(new Uint8Array(data.buffer, data.byteOffset + offset + p, len));
        p += len;
      }
      return { values: arr, consumed: p };
    }
    case PQ_TYPE_FIXED_LEN_BYTE_ARRAY: {
      // typeLength bytes per value. Concatenate into one Uint8Array
      // — the arrow fixed_size_binary column is one contiguous
      // buffer indexed by row × width.
      if (typeLength === undefined || typeLength <= 0) {
        throw new Error("parquet: FIXED_LEN_BYTE_ARRAY decode: missing or invalid typeLength");
      }
      const total = numValues * typeLength;
      const arr = new Uint8Array(total);
      arr.set(new Uint8Array(data.buffer, data.byteOffset + offset, total));
      return { values: arr, consumed: total };
    }
    case PQ_TYPE_BOOLEAN: {
      // PLAIN-encoded booleans are bit-packed LSB-first.
      const arr = new Uint8Array(numValues);
      for (let i = 0; i < numValues; i++) arr[i] = (data[offset + (i >> 3)] >> (i & 7)) & 1;
      return { values: arr, consumed: Math.ceil(numValues / 8) };
    }
  }
  throw new Error(`parquet: PLAIN decode: unsupported physical type ${type}`);
}

// Decode a single dictionary page into a typed array.
function decodeDictionaryPage(
  pageData: Uint8Array,
  numValues: number,
  type: number,
  typeLength?: number,
): { values: any } {
  return { values: decodePlainTyped(pageData, 0, numValues, type, typeLength).values };
}

// Resolve dictionary indices into the dictionary's typed-array values.
// `typeLength` is required when dict is the FLBA Uint8Array (rows are
// contiguous typeLength-byte windows; we expand by indices into a fresh
// rows × typeLength buffer).
function gatherDictionary(dict: any, indices: Int32Array, count: number, typeLength?: number): any {
  if (dict instanceof Int32Array) {
    const out = new Int32Array(count);
    for (let i = 0; i < count; i++) out[i] = dict[indices[i]];
    return out;
  }
  if (dict instanceof BigInt64Array) {
    const out = new BigInt64Array(count);
    for (let i = 0; i < count; i++) out[i] = dict[indices[i]];
    return out;
  }
  if (dict instanceof Float32Array) {
    const out = new Float32Array(count);
    for (let i = 0; i < count; i++) out[i] = dict[indices[i]];
    return out;
  }
  if (dict instanceof Float64Array) {
    const out = new Float64Array(count);
    for (let i = 0; i < count; i++) out[i] = dict[indices[i]];
    return out;
  }
  if (dict instanceof Uint8Array) {
    // FLBA dictionary: dict is dictSize × typeLength bytes; we want
    // count × typeLength bytes formed by copying the indexed window
    // for each output row.
    if (typeLength === undefined) {
      throw new Error("parquet: gatherDictionary: FLBA dictionary requires typeLength");
    }
    const out = new Uint8Array(count * typeLength);
    for (let i = 0; i < count; i++) {
      const src = indices[i] * typeLength;
      out.set(dict.subarray(src, src + typeLength), i * typeLength);
    }
    return out;
  }
  if (Array.isArray(dict)) {
    const out: any[] = new Array(count);
    for (let i = 0; i < count; i++) out[i] = dict[indices[i]];
    return out;
  }
  throw new Error("parquet: gatherDictionary: unsupported dict storage");
}

// ─── Public API ───────────────────────────────────────────────────────────

function arrowKindForPhysical(type: number, convertedType: number | undefined): string {
  switch (type) {
    case PQ_TYPE_BOOLEAN:
      return "bool";
    case PQ_TYPE_INT32:
      // INT32 + ConvertedType=DATE → date32 (days since epoch). Without
      // the annotation it stays int32; the day-count interpretation is
      // metadata-driven, not physical.
      if (convertedType === PQ_CT_DATE) return "date32";
      return "int32";
    case PQ_TYPE_INT64:
      // INT64 + ConvertedType=TIMESTAMP_MILLIS / _MICROS → arrow
      // timestamp_*. INT64 + ConvertedType=DECIMAL → decimal128 (the
      // schema element's precision/scale fields are picked up by the
      // caller via dataTypeForCol). Without an annotation it stays
      // int64 (raw signed-64 column, no extra semantics).
      if (convertedType === PQ_CT_TIMESTAMP_MILLIS) return "timestamp_millis";
      if (convertedType === PQ_CT_TIMESTAMP_MICROS) return "timestamp_micros";
      if (convertedType === PQ_CT_DECIMAL) return "decimal128";
      return "int64";
    case PQ_TYPE_INT96:
      // INT96 is the Spark/Impala-era nanosecond timestamp encoding:
      // 8 bytes nanos-of-day (uint64 LE) + 4 bytes Julian day (uint32
      // LE), 12 bytes total. Newer writers prefer INT64 + TIMESTAMP_*
      // logical types; we still see INT96 from Spark <3.0 outputs and
      // anything routed through Hive. No ConvertedType is meaningful
      // here — the type itself implies "nanosecond timestamp".
      return "timestamp_nanos";
    case PQ_TYPE_FLOAT:
      return "float32";
    case PQ_TYPE_DOUBLE:
      return "float64";
    case PQ_TYPE_BYTE_ARRAY:
      // BYTE_ARRAY is utf8 when explicitly tagged. We treat it as utf8 by
      // default — pyarrow rarely emits raw byte columns from JS-friendly
      // sources.
      void convertedType;
      return "utf8";
    case PQ_TYPE_FIXED_LEN_BYTE_ARRAY:
      // FIXED_LEN_BYTE_ARRAY is the most polymorphic parquet type:
      //   - DECIMAL → decimal128 (precision > 18 needs FLBA backing;
      //     the bytes are big-endian signed, scaled by `scale`)
      //   - everything else → fixed_size_binary (UUIDs, MD5, custom
      //     binary). The width comes from the schema element's
      //     type_length; the caller (dataTypeForCol) plumbs it in.
      if (convertedType === PQ_CT_DECIMAL) return "decimal128";
      return "fixed_size_binary";
  }
  throw new Error(`parquet: physical type ${type} not supported`);
}

function decodeColumnChunk(
  bytes: Uint8Array,
  meta: ColumnMetaData,
  numRows: number,
  isOptional: boolean,
  typeLength?: number,
): { values: any; validity: Uint8Array | undefined } {
  // Read pages from data_page_offset until num_values consumed.
  // Dictionary page (if present) sits at dictionary_page_offset.
  let dict: any | undefined;
  if (meta.dictionaryPageOffset !== undefined) {
    const dictOffset = Number(meta.dictionaryPageOffset);
    const dictReader = new ThriftReader(bytes, dictOffset);
    const dictHeader = parsePageHeader(dictReader);
    if (dictHeader.type !== PQ_PAGE_DICTIONARY_PAGE) {
      throw new Error(`parquet: expected dictionary page at offset ${dictOffset}`);
    }
    const compressedStart = dictReader.pos;
    const compressed = bytes.subarray(compressedStart, compressedStart + dictHeader.compressedSize);
    const decompressed = decompressPage(compressed, meta.codec, dictHeader.uncompressedSize);
    dict = decodeDictionaryPage(decompressed, dictHeader.dictionaryPageHeader!.numValues, meta.type, typeLength).values;
  }

  // Read data pages.
  const validity = isOptional ? new Uint8Array(Math.ceil(numRows / 8)) : undefined;
  if (validity) validity.fill(0xff, 0, Math.ceil(numRows / 8)); // start "all valid"; flip nulls below
  let outValues: any | undefined;
  let outIdx = 0;

  let pos = Number(meta.dataPageOffset);
  let valuesRead = 0;
  const totalValues = Number(meta.numValues);

  while (valuesRead < totalValues) {
    const r = new ThriftReader(bytes, pos);
    const header = parsePageHeader(r);
    if (header.type !== PQ_PAGE_DATA_PAGE && header.type !== PQ_PAGE_DATA_PAGE_V2) {
      throw new Error(`parquet: expected data page, got page type ${header.type}`);
    }

    // V1 vs V2 data pages have different physical layouts and different
    // metadata-bearing structs. Materialize a unified shape:
    //   { numValues, encoding, defLevels, valuesPayload }
    // and feed both branches into the same dictionary-or-PLAIN decode.
    const isV2 = header.type === PQ_PAGE_DATA_PAGE_V2;
    const dataPage = isV2 ? header.dataPageHeaderV2! : header.dataPageHeader!;

    const compressedStart = r.pos;
    const compressed = bytes.subarray(compressedStart, compressedStart + header.compressedSize);

    let dpos = 0;
    const numValues = dataPage.numValues;
    const defLevels = new Int32Array(numValues);
    let valuesData: Uint8Array;

    if (isV2) {
      // V2 layout (entire page body, NEVER compressed for the level streams):
      //   [rep levels (defLevelsByteLength=0 → omitted)]
      //   [def levels  : raw RLE bytes, defLevelsByteLength bytes]
      //   [values      : compressed iff is_compressed, else raw]
      // Headers carry exact byte lengths so we don't have to length-decode.
      const v2 = header.dataPageHeaderV2!;
      const repLen = v2.repLevelsByteLength;
      const defLen = v2.defLevelsByteLength;

      // Rep levels — flat schema means max_rep_level = 0 → repLen = 0.
      // We assert that here rather than walking a no-op stream; if
      // someone hands us a nested file, we'll fail loudly upstream.
      if (repLen !== 0) {
        throw new Error(`parquet: data page V2 with non-zero rep levels (${repLen}B) — nested types not yet supported`);
      }

      // Def levels (uncompressed in V2). RLE-bitpack hybrid as in V1
      // but WITHOUT the i32 length prefix.
      if (isOptional) {
        decodeHybridRleBitPack(compressed, repLen, repLen + defLen, 1, numValues, defLevels);
      } else {
        defLevels.fill(1);
      }

      // Values payload starts after the level streams.
      const valuesStart = repLen + defLen;
      const valuesCompressed = compressed.subarray(valuesStart);
      if (v2.isCompressed && meta.codec !== PQ_CODEC_UNCOMPRESSED) {
        const valuesUncompressedLen = header.uncompressedSize - repLen - defLen;
        valuesData = decompressPage(valuesCompressed, meta.codec, valuesUncompressedLen);
      } else {
        valuesData = valuesCompressed;
      }
      dpos = 0;
    } else {
      // V1 layout (entire page body compressed together):
      //   [rep levels (omitted for flat)][def levels][values]
      // Levels are i32-length-prefixed RLE/bit-pack hybrid streams.
      const decompressed = decompressPage(compressed, meta.codec, header.uncompressedSize);
      valuesData = decompressed;

      if (isOptional) {
        const defLen = new DataView(decompressed.buffer, decompressed.byteOffset + dpos, 4).getInt32(0, true);
        dpos += 4;
        decodeHybridRleBitPack(decompressed, dpos, dpos + defLen, 1, numValues, defLevels);
        dpos += defLen;
      } else {
        defLevels.fill(1);
      }
    }

    // Count non-nulls in this page (== number of physical values to
    // read). For V2 this could also come from `numValues - numNulls`,
    // but the def-level walk is a) consistent across V1/V2, b) defensive
    // against writers that don't populate numNulls.
    let nonNull = 0;
    for (let i = 0; i < numValues; i++) if (defLevels[i] === 1) nonNull++;

    // Values
    let pageValues: any;
    if (dataPage.encoding === PQ_ENC_PLAIN) {
      pageValues = decodePlainTyped(valuesData, dpos, nonNull, meta.type, typeLength).values;
    } else if (dataPage.encoding === PQ_ENC_PLAIN_DICTIONARY || dataPage.encoding === PQ_ENC_RLE_DICTIONARY) {
      if (!dict) throw new Error("parquet: dictionary-encoded page but no dictionary loaded");
      // First byte is the bit width; rest is hybrid RLE/bit-pack of indices.
      const bitWidth = valuesData[dpos];
      dpos += 1;
      const indices = new Int32Array(nonNull);
      decodeHybridRleBitPack(valuesData, dpos, valuesData.length, bitWidth, nonNull, indices);
      pageValues = gatherDictionary(dict, indices, nonNull, typeLength);
    } else {
      throw new Error(`parquet: page encoding ${dataPage.encoding} not supported`);
    }

    // Allocate the output array on first page based on the type. FLBA
    // is special — pageValues is one Uint8Array of nonNull*typeLength
    // bytes, but the output is numRows*typeLength bytes (with null
    // rows zeroed). For BOOLEAN we stay on Uint8Array of length numRows
    // (one byte per row, 0/1). The type-keyed branch disambiguates the
    // two Uint8Array cases.
    if (!outValues) {
      if (meta.type === PQ_TYPE_FIXED_LEN_BYTE_ARRAY) {
        outValues = new Uint8Array(numRows * (typeLength ?? 0));
      } else if (pageValues instanceof Int32Array) outValues = new Int32Array(numRows);
      else if (pageValues instanceof BigInt64Array) outValues = new BigInt64Array(numRows);
      else if (pageValues instanceof Float32Array) outValues = new Float32Array(numRows);
      else if (pageValues instanceof Float64Array) outValues = new Float64Array(numRows);
      else if (pageValues instanceof Uint8Array) outValues = new Uint8Array(numRows);
      else outValues = new Array(numRows);
    }

    // Scatter into outValues by definition level (skip null slots).
    if (meta.type === PQ_TYPE_FIXED_LEN_BYTE_ARRAY) {
      const w = typeLength!;
      const flba = pageValues as Uint8Array;
      let pageValIdx = 0;
      for (let i = 0; i < numValues; i++) {
        if (defLevels[i] === 1) {
          (outValues as Uint8Array).set(flba.subarray(pageValIdx * w, (pageValIdx + 1) * w), (outIdx + i) * w);
          pageValIdx++;
        } else if (validity) {
          const bit = outIdx + i;
          validity[bit >> 3] &= ~(1 << (bit & 7));
          // Null rows already zeroed by Uint8Array allocation default.
        }
      }
    } else {
      let pageValIdx = 0;
      for (let i = 0; i < numValues; i++) {
        if (defLevels[i] === 1) {
          outValues[outIdx + i] = pageValues[pageValIdx++];
        } else if (validity) {
          const bit = outIdx + i;
          validity[bit >> 3] &= ~(1 << (bit & 7));
        }
      }
    }
    outIdx += numValues;
    valuesRead += numValues;

    pos = compressedStart + header.compressedSize;
  }

  return { values: outValues, validity };
}

// Decode one column chunk that's part of a List<primitive> logical
// column. Walks every data page, decodes rep+def levels (these were
// previously off-limits — the flat-only reader threw on non-zero
// rep), accumulates the packed inner values, and reassembles into:
//
//   - offsets[] : Int32Array of length numRows + 1
//   - validity  : Uint8Array (parent list validity); undefined when
//                 the list itself is REQUIRED (never null)
//   - childValues / childValidity : the inner element column data
//   - childCount: total inner element count across all rows
//
// The `inner` ColInfo carries the per-element physicalType + the
// element-level isOptional flag, which we need to know how def
// levels disambiguate "null element" vs "value present".
function decodeListColumnChunk(
  bytes: Uint8Array,
  meta: ColumnMetaData,
  numRows: number,
  outer: {
    isOptional: boolean;
    maxDef: number;
    maxRep: number;
  },
  inner: {
    physicalType: number | undefined;
    isOptional: boolean;
    typeLength: number | undefined;
  },
): {
  offsets: Int32Array;
  validity: Uint8Array | undefined;
  childValues: any;
  childValidity: Uint8Array | undefined;
  childCount: number;
} {
  // Definition-level interpretation depends on whether outer + element
  // are nullable. For the standard 3-level LIST shape:
  //   element REQUIRED, list OPTIONAL: maxDef = 2
  //     0 = list null, 1 = list empty, 2 = element present
  //   element OPTIONAL, list OPTIONAL: maxDef = 3
  //     0 = list null, 1 = list empty, 2 = element null, 3 = element present
  //   element REQUIRED, list REQUIRED: maxDef = 1
  //     0 = list empty, 1 = element present (list never null)
  //   element OPTIONAL, list REQUIRED: maxDef = 2
  //     0 = list empty, 1 = element null, 2 = element present
  const maxDef = outer.maxDef;
  const elemOptional = inner.isOptional;
  const listOptional = outer.isOptional;
  // The def level at which the OUTER list is non-null but empty is
  // computed from how many "nullable contributions" precede the
  // REPEATED level. For our schema shapes that's always 1 for
  // OPTIONAL outer / 0 for REQUIRED outer.
  const emptyDef = listOptional ? 1 : 0;
  // The def level at which a value is present (not null, not empty).
  const presentDef = maxDef;
  // The def level at which the element is null but list was non-null.
  // Only meaningful when element is OPTIONAL.
  const elemNullDef = elemOptional ? maxDef - 1 : -1;

  let dict: any | undefined;
  if (meta.dictionaryPageOffset !== undefined) {
    const dictOffset = Number(meta.dictionaryPageOffset);
    const dictReader = new ThriftReader(bytes, dictOffset);
    const dictHeader = parsePageHeader(dictReader);
    if (dictHeader.type !== PQ_PAGE_DICTIONARY_PAGE) {
      throw new Error(`parquet: expected dictionary page at offset ${dictOffset}`);
    }
    const compressedStart = dictReader.pos;
    const compressed = bytes.subarray(compressedStart, compressedStart + dictHeader.compressedSize);
    const decompressed = decompressPage(compressed, meta.codec, dictHeader.uncompressedSize);
    dict = decodeDictionaryPage(
      decompressed,
      dictHeader.dictionaryPageHeader!.numValues,
      meta.type,
      inner.typeLength,
    ).values;
  }

  // Buffers we accumulate across pages.
  const repAll: number[] = [];
  const defAll: number[] = [];
  let valuesAll: any | undefined; // typed array or string[]; allocated lazily

  let pos = Number(meta.dataPageOffset);
  let valuesRead = 0;
  const totalValues = Number(meta.numValues);

  // Bit width for the level RLE streams.
  const repBitWidth = bitWidthForMax(outer.maxRep);
  const defBitWidth = bitWidthForMax(outer.maxDef);

  while (valuesRead < totalValues) {
    const r = new ThriftReader(bytes, pos);
    const header = parsePageHeader(r);
    if (header.type !== PQ_PAGE_DATA_PAGE && header.type !== PQ_PAGE_DATA_PAGE_V2) {
      throw new Error(`parquet: expected data page, got page type ${header.type}`);
    }
    const isV2 = header.type === PQ_PAGE_DATA_PAGE_V2;
    const dataPage = isV2 ? header.dataPageHeaderV2! : header.dataPageHeader!;

    const compressedStart = r.pos;
    const compressed = bytes.subarray(compressedStart, compressedStart + header.compressedSize);

    const numValuesInPage = dataPage.numValues;
    const repLevels = new Int32Array(numValuesInPage);
    const defLevels = new Int32Array(numValuesInPage);

    let valuesData: Uint8Array;
    let dpos = 0;

    if (isV2) {
      const v2 = header.dataPageHeaderV2!;
      const repLen = v2.repLevelsByteLength;
      const defLen = v2.defLevelsByteLength;
      if (repBitWidth > 0 && repLen > 0) {
        decodeHybridRleBitPack(compressed, 0, repLen, repBitWidth, numValuesInPage, repLevels);
      }
      if (defBitWidth > 0 && defLen > 0) {
        decodeHybridRleBitPack(compressed, repLen, repLen + defLen, defBitWidth, numValuesInPage, defLevels);
      }
      const valuesStart = repLen + defLen;
      const valuesCompressed = compressed.subarray(valuesStart);
      if (v2.isCompressed && meta.codec !== PQ_CODEC_UNCOMPRESSED) {
        const valuesUncompressedLen = header.uncompressedSize - repLen - defLen;
        valuesData = decompressPage(valuesCompressed, meta.codec, valuesUncompressedLen);
      } else {
        valuesData = valuesCompressed;
      }
      dpos = 0;
    } else {
      const decompressed = decompressPage(compressed, meta.codec, header.uncompressedSize);
      valuesData = decompressed;
      // V1 layout: [rep i32-len + body][def i32-len + body][values]
      if (repBitWidth > 0) {
        const repLen = new DataView(decompressed.buffer, decompressed.byteOffset + dpos, 4).getInt32(0, true);
        dpos += 4;
        decodeHybridRleBitPack(decompressed, dpos, dpos + repLen, repBitWidth, numValuesInPage, repLevels);
        dpos += repLen;
      }
      if (defBitWidth > 0) {
        const defLen = new DataView(decompressed.buffer, decompressed.byteOffset + dpos, 4).getInt32(0, true);
        dpos += 4;
        decodeHybridRleBitPack(decompressed, dpos, dpos + defLen, defBitWidth, numValuesInPage, defLevels);
        dpos += defLen;
      }
    }

    // Count present values (def === presentDef) — those are the
    // physical values to read from the values payload.
    let nonNull = 0;
    for (let i = 0; i < numValuesInPage; i++) if (defLevels[i] === presentDef) nonNull++;

    let pageValues: any;
    if (dataPage.encoding === PQ_ENC_PLAIN) {
      pageValues = decodePlainTyped(valuesData, dpos, nonNull, meta.type, inner.typeLength).values;
    } else if (dataPage.encoding === PQ_ENC_PLAIN_DICTIONARY || dataPage.encoding === PQ_ENC_RLE_DICTIONARY) {
      if (!dict) throw new Error("parquet: dictionary-encoded list page but no dictionary loaded");
      const bw = valuesData[dpos];
      dpos += 1;
      const indices = new Int32Array(nonNull);
      decodeHybridRleBitPack(valuesData, dpos, valuesData.length, bw, nonNull, indices);
      pageValues = gatherDictionary(dict, indices, nonNull, inner.typeLength);
    } else {
      throw new Error(`parquet: list page encoding ${dataPage.encoding} not supported`);
    }

    // Accumulate.
    for (let i = 0; i < numValuesInPage; i++) {
      repAll.push(repLevels[i]);
      defAll.push(defLevels[i]);
    }
    if (!valuesAll) valuesAll = valuesArrayLike(pageValues, 0); // empty seed of right type
    valuesAll = concatValues(valuesAll, pageValues, nonNull);

    valuesRead += numValuesInPage;
    pos = compressedStart + header.compressedSize;
  }

  // Reassemble. Walk rep+def levels:
  //   rep === 0 starts a new outer row
  //   def === 0 (and listOptional) → list null at this row
  //   def === emptyDef → empty list
  //   def === presentDef → present element (consume one value from valuesAll)
  //   def === elemNullDef (when elemOptional) → null element (no value, but childValidity bit cleared)
  const offsets = new Int32Array(numRows + 1);
  const validity = listOptional ? new Uint8Array(Math.ceil(numRows / 8)) : undefined;
  if (validity) validity.fill(0xff, 0, validity.length);

  // Pre-count child rows so we can size the inner column.
  let childCount = 0;
  for (let i = 0; i < defAll.length; i++) {
    const def = defAll[i];
    if (def === presentDef || def === elemNullDef) childCount++;
  }
  const childValidity = elemOptional ? new Uint8Array(Math.ceil(childCount / 8)) : undefined;
  if (childValidity) childValidity.fill(0xff);

  let childValues: any;
  if (meta.type === PQ_TYPE_FIXED_LEN_BYTE_ARRAY) {
    childValues = new Uint8Array(childCount * (inner.typeLength ?? 0));
  } else if (valuesAll instanceof Int32Array) childValues = new Int32Array(childCount);
  else if (valuesAll instanceof BigInt64Array) childValues = new BigInt64Array(childCount);
  else if (valuesAll instanceof Float32Array) childValues = new Float32Array(childCount);
  else if (valuesAll instanceof Float64Array) childValues = new Float64Array(childCount);
  else if (valuesAll instanceof Uint8Array) childValues = new Uint8Array(childCount);
  else childValues = new Array(childCount);

  let row = -1;
  let childIdx = 0;
  let valIdx = 0;
  const flbaW = meta.type === PQ_TYPE_FIXED_LEN_BYTE_ARRAY ? inner.typeLength! : 0;
  for (let i = 0; i < defAll.length; i++) {
    const rep = repAll[i];
    const def = defAll[i];
    if (rep === 0) {
      row++;
      // Fill offsets so far: row's offset starts at current childIdx.
      offsets[row] = childIdx;
    }
    if (listOptional && def === 0) {
      const bit = row;
      validity![bit >> 3] &= ~(1 << (bit & 7));
      // Null list: no children appended.
    } else if (def === emptyDef && def !== presentDef) {
      // Empty list: no children appended.
    } else if (def === presentDef) {
      // Present element.
      if (meta.type === PQ_TYPE_FIXED_LEN_BYTE_ARRAY) {
        (childValues as Uint8Array).set(
          (valuesAll as Uint8Array).subarray(valIdx * flbaW, (valIdx + 1) * flbaW),
          childIdx * flbaW,
        );
      } else {
        childValues[childIdx] = valuesAll[valIdx];
      }
      childIdx++;
      valIdx++;
    } else if (def === elemNullDef) {
      // Null element inside a non-null list: bump childIdx, mark
      // childValidity, don't consume a physical value.
      const bit = childIdx;
      childValidity![bit >> 3] &= ~(1 << (bit & 7));
      childIdx++;
    } else {
      throw new Error(`parquet: unexpected def level ${def} (max ${maxDef}) in list column`);
    }
  }
  // Trailing offset.
  offsets[numRows] = childIdx;
  // Any rows past the last actual rep=0 (only possible when totalValues=0 + numRows>0)
  // get offsets filled with childIdx already (Int32Array zeroed; childIdx=0).

  return { offsets, validity, childValues, childValidity, childCount };
}

// Bit width needed to encode values in [0, max]. RLE/bit-pack hybrid
// uses width=0 for max=0 streams (which contain no payload).
function bitWidthForMax(max: number): number {
  if (max === 0) return 0;
  let w = 0;
  let v = max;
  while (v > 0) {
    w++;
    v >>>= 1;
  }
  return w;
}

function valuesArrayLike(template: any, count: number): any {
  if (template instanceof Int32Array) return new Int32Array(count);
  if (template instanceof BigInt64Array) return new BigInt64Array(count);
  if (template instanceof Float32Array) return new Float32Array(count);
  if (template instanceof Float64Array) return new Float64Array(count);
  if (template instanceof Uint8Array) return new Uint8Array(count);
  return new Array(count);
}

function concatValues(prev: any, next: any, nextCount: number): any {
  const prevLen = prev.length;
  const nextLen = next instanceof Uint8Array && nextCount * 1 !== next.length ? next.length : nextCount;
  // For typed arrays we need byte-length match; compute element count
  // for FLBA storage (where next.length might be nextCount * width).
  const out = valuesArrayLike(prev, prevLen + nextLen);
  if (Array.isArray(out)) {
    for (let i = 0; i < prevLen; i++) out[i] = prev[i];
    for (let i = 0; i < nextLen; i++) out[prevLen + i] = next[i];
  } else {
    (out as any).set(prev, 0);
    (out as any).set(next, prevLen);
  }
  return out;
}

// Read all bloom filters from a parquet file. Returns one entry per
// (rowGroupIndex, columnName) tuple — rowGroup-scoped because each
// row group has its own filter, and a query that spans multiple row
// groups must check each independently.
//
// Each filter exposes `mightContain(value)` → boolean.
//   - `true` means the value MIGHT be present (could be a false
//     positive, since the filter is probabilistic). Caller must
//     check the actual data.
//   - `false` means the value is DEFINITELY NOT present. Caller can
//     safely skip the row group.
//
// Columns without a bloom filter (writer didn't emit one, or the
// file predates parquet 2.7) simply don't appear in the map.
export type ParquetBloomFilter = {
  /** Probabilistic membership check. False = definitely not present. */
  mightContain(value: any): boolean;
  /** Filter size in bytes (multiple of 32). */
  numBytes: number;
};
export type ParquetBloomFilters = Array<Map<string, ParquetBloomFilter>>;

export function readBloomFilters(bytes: Uint8Array): ParquetBloomFilters {
  if (bytes.length < 12 || bytes[0] !== 0x50 || bytes[1] !== 0x41 || bytes[2] !== 0x52 || bytes[3] !== 0x31) {
    throw new Error("parquet: missing PAR1 magic");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const footerLen = view.getInt32(bytes.length - 8, true);
  const footerStart = bytes.length - 8 - footerLen;
  const footerReader = new ThriftReader(bytes.subarray(footerStart, bytes.length - 8));
  const meta = parseFileMetaData(footerReader);
  const out: ParquetBloomFilters = [];
  for (const rg of meta.rowGroups) {
    const m = new Map<string, ParquetBloomFilter>();
    for (const chunk of rg.columns) {
      const md = chunk.metaData;
      if (md.bloomFilterOffset === undefined) continue;
      const off = Number(md.bloomFilterOffset);
      const r = new ThriftReader(bytes, off);
      const header = parseBloomFilterHeader(r);
      const numBytes = header.numBytes;
      const numBlocks = numBytes / SBBF_BLOCK_BYTES;
      // The bitmap follows the header inline. Header consumed `r.pos -
      // off` bytes; bitmap = next numBytes after that.
      const bitmapStart = r.pos;
      const bitmapBytes = bytes.subarray(bitmapStart, bitmapStart + numBytes);
      // The parquet file's bloom-filter offset isn't guaranteed to be
      // 4-byte aligned, so we can't directly alias the slice as a
      // Uint32Array. Copy into a fresh Uint8Array (whose backing
      // ArrayBuffer is fresh + aligned at 0), then alias.
      const aligned = new Uint8Array(numBytes);
      aligned.set(bitmapBytes);
      const blocks = new Uint32Array(aligned.buffer, 0, numBlocks * 8);
      const physicalType = md.type;
      // typeLength for FLBA pulls from the schema; for non-FLBA
      // bloom-filterable types it's irrelevant.
      let typeLength: number | undefined;
      if (physicalType === PQ_TYPE_FIXED_LEN_BYTE_ARRAY) {
        // Walk the schema to find this column's leaf and grab
        // type_length. Path-in-schema's last entry is the leaf name.
        const leafName = md.pathInSchema[md.pathInSchema.length - 1];
        for (const e of meta.schema) {
          if (e.name === leafName && e.typeLength !== undefined) {
            typeLength = e.typeLength;
            break;
          }
        }
      }
      const colName = md.pathInSchema.length > 0 ? md.pathInSchema[0] : "";
      m.set(colName, {
        numBytes,
        mightContain(value: any): boolean {
          const h = bloomHashValue(value, physicalType, typeLength);
          return sbbfMightContain(blocks, numBlocks, h);
        },
      });
    }
    out.push(m);
  }
  return out;
}

export function fromParquet(bytes: Uint8Array): TableLike {
  const { Column, RecordBatch, Table } = getTypes();

  // Magic + footer.
  if (
    bytes.length < 12 ||
    bytes[0] !== 0x50 ||
    bytes[1] !== 0x41 ||
    bytes[2] !== 0x52 ||
    bytes[3] !== 0x31 ||
    bytes[bytes.length - 4] !== 0x50 ||
    bytes[bytes.length - 3] !== 0x41 ||
    bytes[bytes.length - 2] !== 0x52 ||
    bytes[bytes.length - 1] !== 0x31
  ) {
    throw new Error("parquet: missing PAR1 magic at start or end");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const footerLen = view.getInt32(bytes.length - 8, true);
  const footerStart = bytes.length - 8 - footerLen;
  if (footerStart < 4) throw new Error(`parquet: invalid footer length ${footerLen}`);
  const footerBytes = bytes.subarray(footerStart, bytes.length - 8);
  const footerReader = new ThriftReader(footerBytes);
  const meta = parseFileMetaData(footerReader);

  // Parquet schema is a flat list traversed depth-first; node[0] is the
  // root group. parseSchemaTree consumes the depth-first stream and
  // builds a tree of ColInfo nodes, recognizing the standard 3-level
  // LIST pattern:
  //
  //   <repetition> group <name> (LIST) {
  //     repeated group list { <repetition> <type> element; }
  //   }
  //
  // and collapsing it into a single ColInfo with category="list" +
  // an inner primitive ColInfo. Map / Struct / nested-list still
  // throw — the columnar reassembly for those needs more rep/def
  // bookkeeping than v1 carries.
  type ColInfo = {
    name: string;
    category: "primitive" | "list";
    /** Primitive: physical type from parquet.thrift Type enum. */
    physicalType: number | undefined;
    /** Primitive: pre-2.4 ConvertedType annotation. */
    convertedType: number | undefined;
    /** True when this column (the OUTER repetition for lists) is OPTIONAL. */
    isOptional: boolean;
    /** decimal128: total digit count from the schema element. */
    precision: number | undefined;
    /** decimal128: digits-after-decimal-point from the schema element. */
    scale: number | undefined;
    /** FIXED_LEN_BYTE_ARRAY width in bytes; required for FLBA columns. */
    typeLength: number | undefined;
    /** List: the element ColInfo. Undefined for primitives. */
    inner: ColInfo | undefined;
    /** Maximum definition level the page-decoder will see for this column. */
    maxDef: number;
    /** Maximum repetition level the page-decoder will see for this column. */
    maxRep: number;
  };

  function parseSchemaTree(): { cols: ColInfo[]; cursor: number } {
    let cursor = 1; // skip root
    const cols: ColInfo[] = [];

    function consume(parentDef: number, parentRep: number): ColInfo {
      if (cursor >= meta.schema.length) {
        throw new Error("parquet: schema underrun while parsing nested column");
      }
      const e = meta.schema[cursor++];
      const localDef = e.repetitionType === PQ_REP_OPTIONAL ? 1 : e.repetitionType === PQ_REP_REPEATED ? 1 : 0;
      const localRep = e.repetitionType === PQ_REP_REPEATED ? 1 : 0;
      const myDef = parentDef + localDef;
      const myRep = parentRep + localRep;

      // LIST pattern: this is a group with LIST converted_type, expect
      // a single REPEATED child group, which has a single child leaf.
      if (e.numChildren > 0 && e.convertedType === PQ_CT_LIST) {
        if (e.numChildren !== 1) {
          throw new Error(`parquet: LIST group "${e.name}" must have exactly 1 child (got ${e.numChildren})`);
        }
        const middle = meta.schema[cursor];
        if (middle.repetitionType !== PQ_REP_REPEATED) {
          throw new Error(`parquet: LIST group "${e.name}" middle element must be REPEATED`);
        }
        if (middle.numChildren !== 1) {
          throw new Error(`parquet: LIST group "${e.name}" middle element must have exactly 1 child`);
        }
        // Walk the middle group (consumes 1) then the leaf inside (consumes 1).
        const middleDef = myDef + 1; // REPEATED contributes 1
        const middleRep = myRep + 1;
        cursor++; // consume middle
        const leaf = meta.schema[cursor++];
        if (leaf.numChildren > 0) {
          throw new Error(`parquet: nested LIST<group> not yet supported (column "${e.name}")`);
        }
        if (leaf.type === undefined) {
          throw new Error(`parquet: LIST leaf "${leaf.name}" has no physical type`);
        }
        const elemDef = middleDef + (leaf.repetitionType === PQ_REP_OPTIONAL ? 1 : 0);
        const inner: ColInfo = {
          name: leaf.name,
          category: "primitive",
          physicalType: leaf.type,
          convertedType: leaf.convertedType,
          isOptional: leaf.repetitionType === PQ_REP_OPTIONAL,
          precision: leaf.precision,
          scale: leaf.scale,
          typeLength: leaf.typeLength,
          inner: undefined,
          maxDef: elemDef,
          maxRep: middleRep,
        };
        return {
          name: e.name,
          category: "list",
          physicalType: undefined,
          convertedType: PQ_CT_LIST,
          isOptional: e.repetitionType === PQ_REP_OPTIONAL,
          precision: undefined,
          scale: undefined,
          typeLength: undefined,
          inner,
          maxDef: elemDef,
          maxRep: middleRep,
        };
      }

      if (e.numChildren > 0) {
        throw new Error(`parquet: nested schemas (Map / Struct) not yet supported (column "${e.name}")`);
      }
      if (e.type === undefined) {
        throw new Error(`parquet: leaf "${e.name}" has no physical type`);
      }
      return {
        name: e.name,
        category: "primitive",
        physicalType: e.type,
        convertedType: e.convertedType,
        isOptional: e.repetitionType === PQ_REP_OPTIONAL,
        precision: e.precision,
        scale: e.scale,
        typeLength: e.typeLength,
        inner: undefined,
        maxDef: myDef,
        maxRep: myRep,
      };
    }

    while (cursor < meta.schema.length) {
      cols.push(consume(0, 0));
    }
    return { cols, cursor };
  }
  const { cols } = parseSchemaTree();

  // Resolve a ColInfo into a full arrow DataType. Pulls precision /
  // scale into decimal128's type object; falls back to a bare-kind
  // type for everything else. Fails loudly when a decimal column
  // arrives without precision in the schema (corrupt or
  // non-conformant writer).
  function dataTypeForCol(c: ColInfo): any {
    if (c.category === "list") {
      return { kind: "list", child: dataTypeForCol(c.inner!) };
    }
    const kind = arrowKindForPhysical(c.physicalType!, c.convertedType);
    if (kind === "decimal128") {
      if (c.precision === undefined) {
        throw new Error(`parquet: decimal column "${c.name}" missing precision in schema`);
      }
      return { kind, precision: c.precision, scale: c.scale ?? 0 };
    }
    if (kind === "fixed_size_binary") {
      if (c.typeLength === undefined || c.typeLength <= 0) {
        throw new Error(`parquet: FIXED_LEN_BYTE_ARRAY column "${c.name}" missing type_length in schema`);
      }
      return { kind, width: c.typeLength };
    }
    return { kind };
  }

  // Build one RecordBatch per row group.
  const batches: RecordBatchLike[] = [];
  for (const rg of meta.rowGroups) {
    const numRows = Number(rg.numRows);
    const batchColumns: ColumnLike[] = [];
    for (let i = 0; i < cols.length; i++) {
      const colInfo = cols[i];
      const chunk = rg.columns[i];
      if (colInfo.category === "list") {
        // List columns: rep+def levels disambiguate row boundaries +
        // null lists + empty lists. The page decoder gives us the
        // packed inner values + the level streams; we reassemble the
        // arrow ListColumn (offsets[] + child + validity) here.
        const inner = colInfo.inner!;
        const decoded = decodeListColumnChunk(bytes, chunk.metaData, numRows, colInfo, inner);
        const innerType = dataTypeForCol(inner);
        const child = new Column(innerType, decoded.childCount, decoded.childValues, decoded.childValidity);
        batchColumns.push(new Column(dataTypeForCol(colInfo), numRows, decoded.offsets, decoded.validity, child));
      } else {
        const { values, validity } = decodeColumnChunk(
          bytes,
          chunk.metaData,
          numRows,
          colInfo.isOptional,
          colInfo.typeLength,
        );
        const dataType = dataTypeForCol(colInfo);
        batchColumns.push(new Column(dataType, numRows, values, validity));
      }
    }
    const schemaForBatch = {
      fields: cols.map(c => ({
        name: c.name,
        type: dataTypeForCol(c),
        nullable: c.isOptional,
      })),
    };
    batches.push(new RecordBatch(schemaForBatch, batchColumns, numRows));
  }

  const tableSchema = {
    fields: cols.map(c => ({
      name: c.name,
      type: dataTypeForCol(c),
      nullable: c.isOptional,
    })),
  };
  return new Table(tableSchema, batches);
}

// ─── Writer ───────────────────────────────────────────────────────────────
// toParquet emits a single row group, PLAIN-encoded, with optional SNAPPY
// or GZIP compression. Output is bit-for-bit readable by pyarrow / arrow-rs
// / duckdb on the basic types — narrow but correct.
//
// The writer doesn't dictionary-encode strings or bit-pack low-cardinality
// columns yet; for a tiny.en-style toy fixture both pyarrow and Parabun
// ship roughly equivalent file sizes thanks to SNAPPY. For workloads where
// density matters, the dictionary path lands as a follow-up.

class ByteWriter {
  buf: Uint8Array;
  view: DataView;
  pos: number;

  constructor(initial: number = 4096) {
    this.buf = new Uint8Array(initial);
    this.view = new DataView(this.buf.buffer);
    this.pos = 0;
  }

  private grow(min: number): void {
    if (this.buf.length >= min) return;
    let cap = this.buf.length;
    while (cap < min) cap *= 2;
    const next = new Uint8Array(cap);
    next.set(this.buf, 0);
    this.buf = next;
    this.view = new DataView(next.buffer);
  }

  writeBytes(src: Uint8Array): void {
    this.grow(this.pos + src.length);
    this.buf.set(src, this.pos);
    this.pos += src.length;
  }

  writeU8(v: number): void {
    this.grow(this.pos + 1);
    this.buf[this.pos++] = v & 0xff;
  }

  writeI32LE(v: number): void {
    this.grow(this.pos + 4);
    this.view.setInt32(this.pos, v, true);
    this.pos += 4;
  }

  writeF32LE(v: number): void {
    this.grow(this.pos + 4);
    this.view.setFloat32(this.pos, v, true);
    this.pos += 4;
  }

  writeF64LE(v: number): void {
    this.grow(this.pos + 8);
    this.view.setFloat64(this.pos, v, true);
    this.pos += 8;
  }

  writeI64LE(v: bigint): void {
    this.grow(this.pos + 8);
    this.view.setBigInt64(this.pos, v, true);
    this.pos += 8;
  }

  // Unsigned varint.
  writeVarint(v: number): void {
    while (v > 0x7f) {
      this.writeU8((v & 0x7f) | 0x80);
      v >>>= 7;
    }
    this.writeU8(v & 0x7f);
  }

  writeZigzagI32(v: number): void {
    this.writeVarint(((v << 1) ^ (v >> 31)) >>> 0);
  }

  writeZigzagI64(v: bigint): void {
    let zz = (v << 1n) ^ (v >> 63n);
    while ((zz & ~0x7fn) !== 0n) {
      this.writeU8(Number(zz & 0x7fn) | 0x80);
      zz >>= 7n;
    }
    this.writeU8(Number(zz & 0x7fn));
  }

  finish(): Uint8Array {
    return this.buf.slice(0, this.pos);
  }
}

// ─── Thrift compact writer ────────────────────────────────────────────────
//
// Field header: a 1-byte head where the high nibble is the delta from
// the last field id (1..15) and the low nibble is the element type. If
// the delta is > 15, the high nibble is 0 and the field id follows as a
// zigzag varint.

class ThriftWriter {
  out: ByteWriter;

  constructor() {
    this.out = new ByteWriter();
  }

  writeFieldHeader(lastFieldId: number, fieldId: number, type: number): void {
    const delta = fieldId - lastFieldId;
    if (delta > 0 && delta <= 15) {
      this.out.writeU8(((delta & 0x0f) << 4) | (type & 0x0f));
    } else {
      this.out.writeU8(type & 0x0f);
      this.out.writeZigzagI32(fieldId);
    }
  }

  writeStop(): void {
    this.out.writeU8(0);
  }

  writeBool(lastFieldId: number, fieldId: number, value: boolean): number {
    this.writeFieldHeader(lastFieldId, fieldId, value ? TC_BOOL_TRUE : TC_BOOL_FALSE);
    return fieldId;
  }

  writeI32(lastFieldId: number, fieldId: number, value: number): number {
    this.writeFieldHeader(lastFieldId, fieldId, TC_I32);
    this.out.writeZigzagI32(value);
    return fieldId;
  }

  writeI64(lastFieldId: number, fieldId: number, value: bigint): number {
    this.writeFieldHeader(lastFieldId, fieldId, TC_I64);
    this.out.writeZigzagI64(value);
    return fieldId;
  }

  writeBinary(lastFieldId: number, fieldId: number, bytes: Uint8Array): number {
    this.writeFieldHeader(lastFieldId, fieldId, TC_BINARY);
    this.out.writeVarint(bytes.length);
    this.out.writeBytes(bytes);
    return fieldId;
  }

  writeString(lastFieldId: number, fieldId: number, value: string): number {
    return this.writeBinary(lastFieldId, fieldId, new TextEncoder().encode(value));
  }

  // List header: 1 byte high-nibble = size (or 15 for long form), low nibble = element type.
  writeListHeader(elementType: number, size: number): void {
    if (size < 15) {
      this.out.writeU8(((size & 0x0f) << 4) | (elementType & 0x0f));
    } else {
      this.out.writeU8(0xf0 | (elementType & 0x0f));
      this.out.writeVarint(size);
    }
  }

  finish(): Uint8Array {
    return this.out.finish();
  }
}

// ─── Snappy compression ───────────────────────────────────────────────────
// Hash-based compressor matching the reference algorithm: scan a sliding
// window, look up the current 4-byte prefix in a hash table for the most
// recent occurrence, emit a copy if a match is found, otherwise extend the
// pending literal run. The reference picks 14-bit hash table sizes for
// good speed/ratio balance.

function snappyCompress(input: Uint8Array): Uint8Array {
  const out: number[] = [];

  // Uncompressed length prefix (varint).
  let len = input.length;
  while (len > 0x7f) {
    out.push((len & 0x7f) | 0x80);
    len >>>= 7;
  }
  out.push(len & 0x7f);

  if (input.length === 0) return new Uint8Array(out);

  const HASH_BITS = 14;
  const HASH_SIZE = 1 << HASH_BITS;
  const table = new Int32Array(HASH_SIZE).fill(-1);

  const hashAt = (i: number): number => {
    // 32-bit FNV-ish; matches reference behavior closely enough.
    const u = (input[i] | (input[i + 1] << 8) | (input[i + 2] << 16) | (input[i + 3] << 24)) >>> 0;
    return (u * 0x1e35a7bd) >>> (32 - HASH_BITS);
  };

  const writeLiteral = (start: number, end: number): void => {
    if (end <= start) return;
    const litLen = end - start;
    const tag = litLen - 1;
    if (tag < 60) {
      out.push((tag << 2) | 0);
    } else {
      // Use n bytes of length.
      let extras = 0;
      let v = tag;
      while (v > 0) {
        extras++;
        v >>>= 8;
      }
      out.push(((59 + extras) << 2) | 0);
      v = tag;
      for (let i = 0; i < extras; i++) {
        out.push(v & 0xff);
        v >>>= 8;
      }
    }
    for (let i = start; i < end; i++) out.push(input[i]);
  };

  const writeCopy = (offset: number, length: number): void => {
    while (length >= 68) {
      // 64-byte 2-byte-offset copy at most per emission.
      out.push((63 << 2) | 2);
      out.push(offset & 0xff);
      out.push((offset >> 8) & 0xff);
      length -= 64;
    }
    if (length > 64) {
      // Split into 60 + remainder.
      out.push((59 << 2) | 2);
      out.push(offset & 0xff);
      out.push((offset >> 8) & 0xff);
      length -= 60;
    }
    if (length >= 4 && length < 12 && offset < 2048) {
      // 1-byte-offset variant.
      out.push(((length - 4) << 2) | 1 | (((offset >> 8) & 0x07) << 5));
      out.push(offset & 0xff);
    } else {
      out.push(((length - 1) << 2) | 2);
      out.push(offset & 0xff);
      out.push((offset >> 8) & 0xff);
    }
  };

  const inputLen = input.length;
  const skipMargin = 4;
  let cursor = 0;
  let nextLiteralStart = 0;

  while (cursor + skipMargin < inputLen) {
    const h = hashAt(cursor);
    const cand = table[h];
    table[h] = cursor;

    if (
      cand >= 0 &&
      cursor - cand < 65536 &&
      input[cand] === input[cursor] &&
      input[cand + 1] === input[cursor + 1] &&
      input[cand + 2] === input[cursor + 2] &&
      input[cand + 3] === input[cursor + 3]
    ) {
      // Flush any pending literal run.
      writeLiteral(nextLiteralStart, cursor);
      const offset = cursor - cand;
      // Extend match.
      let matchLen = 4;
      while (cursor + matchLen < inputLen && input[cand + matchLen] === input[cursor + matchLen]) {
        matchLen++;
      }
      writeCopy(offset, matchLen);
      cursor += matchLen;
      nextLiteralStart = cursor;
    } else {
      cursor++;
    }
  }
  // Flush trailing literal.
  writeLiteral(nextLiteralStart, inputLen);
  return new Uint8Array(out);
}

// ─── Page writer ──────────────────────────────────────────────────────────

function encodePlainTyped(values: any, count: number, type: number, typeLength?: number): Uint8Array {
  const w = new ByteWriter();
  switch (type) {
    case PQ_TYPE_INT32:
      for (let i = 0; i < count; i++) w.writeI32LE(values[i]);
      break;
    case PQ_TYPE_INT64:
      for (let i = 0; i < count; i++) w.writeI64LE(values[i]);
      break;
    case PQ_TYPE_INT96: {
      // values is a BigInt64Array of nanoseconds since Unix epoch.
      // Decompose each into (julianDay, nanosOfDay) and emit
      // 8 bytes nanos + 4 bytes JD, little-endian. JD 2440588 = 1970-01-01.
      const NANOS_PER_DAY = 86_400_000_000_000n;
      for (let i = 0; i < count; i++) {
        const nanos: bigint = values[i];
        // BigInt math: floored division for negative timestamps.
        let unixDays = nanos / NANOS_PER_DAY;
        let nanosOfDay = nanos - unixDays * NANOS_PER_DAY;
        if (nanosOfDay < 0n) {
          unixDays -= 1n;
          nanosOfDay += NANOS_PER_DAY;
        }
        const julianDay = unixDays + 2440588n;
        w.writeI64LE(BigInt.asIntN(64, nanosOfDay));
        w.writeI32LE(Number(BigInt.asUintN(32, julianDay)));
      }
      break;
    }
    case PQ_TYPE_FLOAT:
      for (let i = 0; i < count; i++) w.writeF32LE(values[i]);
      break;
    case PQ_TYPE_DOUBLE:
      for (let i = 0; i < count; i++) w.writeF64LE(values[i]);
      break;
    case PQ_TYPE_BYTE_ARRAY: {
      const enc = new TextEncoder();
      for (let i = 0; i < count; i++) {
        const bytes = enc.encode(values[i] ?? "");
        w.writeI32LE(bytes.length);
        w.writeBytes(bytes);
      }
      break;
    }
    case PQ_TYPE_FIXED_LEN_BYTE_ARRAY: {
      // values is a single Uint8Array of count × typeLength bytes
      // — the contiguous fixed_size_binary backing buffer. Just
      // copy the prefix verbatim.
      if (typeLength === undefined) {
        throw new Error("parquet writer: FIXED_LEN_BYTE_ARRAY encode: missing typeLength");
      }
      w.writeBytes((values as Uint8Array).subarray(0, count * typeLength));
      break;
    }
    case PQ_TYPE_BOOLEAN: {
      // Bit-pack LSB-first.
      const packed = new Uint8Array(Math.ceil(count / 8));
      for (let i = 0; i < count; i++) {
        if (values[i]) packed[i >> 3] |= 1 << (i & 7);
      }
      w.writeBytes(packed);
      break;
    }
    default:
      throw new Error(`parquet writer: PLAIN encode: unsupported type ${type}`);
  }
  return w.finish();
}

// Encode an array of {0,1} definition levels as a single RLE run wrapped
// in the i32-length-prefixed RLE/bit-pack hybrid expected for V1 pages
// when the def level is at most 1.
function encodeDefLevelsAllOne(count: number): Uint8Array {
  // bitWidth=1 (max level=1). Two cases:
  //   - All 1s (no nulls) → single RLE run of `count` × 1.
  //   - Mixed → bit-packed group(s).
  // For simplicity emit a single RLE run; callers that need null handling
  // use encodeDefLevelsRle below.
  void count;
  throw new Error("internal: use encodeDefLevelsRle");
}

function encodeDefLevelsRle(defLevels: Uint8Array, count: number): Uint8Array {
  // Hybrid format: varint header + body. For a run, header = (runLen << 1) | 0,
  // body = bitWidth-bytes value (1 byte for bitWidth=1).
  // For bit-packed, header = (numGroups << 1) | 1, body = numGroups × 8 × bitWidth bits.
  //
  // Simplest correct encoder: walk the levels, emit alternating RLE runs.
  const w = new ByteWriter();
  let i = 0;
  while (i < count) {
    const v = defLevels[i];
    let runLen = 1;
    while (i + runLen < count && defLevels[i + runLen] === v) runLen++;
    // Emit RLE run: (runLen << 1) | 0
    w.writeVarint(runLen << 1);
    w.writeU8(v);
    i += runLen;
  }
  return w.finish();
}

// Generalized RLE-only level encoder for arbitrary bitWidth (>= 1).
// Body is `ceil(bitWidth/8)` little-endian bytes per run value. We
// don't emit bit-packed runs — RLE alone is correct and decodes
// identically; bit-packing is just smaller for short runs.
function encodeLevelsRle(levels: Int32Array | Uint8Array, count: number, bitWidth: number): Uint8Array {
  const w = new ByteWriter();
  if (bitWidth === 0) return w.finish(); // nothing to encode
  const bytesPerValue = Math.max(1, (bitWidth + 7) >> 3);
  let i = 0;
  while (i < count) {
    const v = levels[i];
    let runLen = 1;
    while (i + runLen < count && levels[i + runLen] === v) runLen++;
    w.writeVarint(runLen << 1);
    for (let b = 0; b < bytesPerValue; b++) {
      w.writeU8((v >>> (b * 8)) & 0xff);
    }
    i += runLen;
  }
  return w.finish();
}

// Build a V1 data page: [def levels (i32-prefixed RLE)] [values (PLAIN)]
function buildDataPageBody(
  values: any,
  count: number,
  type: number,
  defLevels: Uint8Array | undefined,
  numNonNull: number,
  typeLength?: number,
): Uint8Array {
  const w = new ByteWriter();
  if (defLevels !== undefined) {
    const enc = encodeDefLevelsRle(defLevels, count);
    w.writeI32LE(enc.length);
    w.writeBytes(enc);
  }
  // For FLBA `values` is one Uint8Array of nonNull*typeLength bytes —
  // length doesn't equal the row count so the caller passes the row
  // count explicitly.
  const plain = encodePlainTyped(values, numNonNull, type, typeLength);
  w.writeBytes(plain);
  return w.finish();
}

// ─── FileMetaData writer ──────────────────────────────────────────────────

interface ColumnPlan {
  name: string;
  physicalType: number;
  // Pre-2.4 logical-type annotation (utf8, date32, timestamp, etc.).
  // Optional — only set when the arrow kind needs an annotation that
  // the physical type alone can't carry (date32 → INT32 + DATE).
  convertedType: number | undefined;
  // Decimal-only: total digit count and digits-after-decimal-point.
  // Both undefined for non-decimal columns; both required when
  // convertedType is DECIMAL.
  precision: number | undefined;
  scale: number | undefined;
  // FIXED_LEN_BYTE_ARRAY width — required for FLBA columns. Goes into
  // the SchemaElement's type_length (field 2).
  typeLength: number | undefined;
  isOptional: boolean;
  // List columns: when set, the writer emits 3 schema elements per
  // logical column (outer LIST group → repeated middle group → leaf
  // primitive) instead of 1, and the page contains rep+def levels.
  // The fields above describe the LEAF primitive in that case.
  listOuterOptional: boolean | undefined;
  listElemOptional: boolean | undefined;
  // Page bytes (already compressed if codec != UNCOMPRESSED).
  compressedPage: Uint8Array;
  uncompressedSize: number;
  numValues: number;
  numNonNull: number;
  // Optional column-chunk statistics. Populated by toParquet when
  // there's at least one non-null value; downstream readers
  // (DuckDB / Polars / pyarrow) use these for predicate pushdown.
  stats:
    | {
        minBytes: Uint8Array;
        maxBytes: Uint8Array;
        nullCount: bigint;
      }
    | undefined;
  /**
   * Bloom-filter region (header + bitmap), pre-built. Patched in
   * after the data pages so we know its file offset; emitted by
   * writeColumnMetaData as fields 14/15.
   */
  bloomFilter: Uint8Array | undefined;
  bloomFilterOffset: bigint | undefined;
}

// Compute min/max + null count for a typed-array column. The min/max
// are emitted as PLAIN-encoded bytes (matching what downstream readers
// expect for a column-chunk Statistics record). For BYTE_ARRAY (utf8)
// columns we do lexicographic UTF-8 byte comparison — same definition
// the parquet spec uses.
function computeColumnStats(
  values: any,
  numNonNull: number,
  numTotal: number,
  physicalType: number,
): { minBytes: Uint8Array; maxBytes: Uint8Array; nullCount: bigint } | undefined {
  if (numNonNull === 0) return undefined;
  // INT96 + FLBA: stats are optional in the spec and the comparison
  // semantics (especially for INT96, which is signed-comparison-
  // ambiguous historically) aren't worth the complexity here. Skip
  // them; readers handle missing stats as "unknown" already.
  if (physicalType === PQ_TYPE_INT96 || physicalType === PQ_TYPE_FIXED_LEN_BYTE_ARRAY) {
    return undefined;
  }
  const nullCount = BigInt(numTotal - numNonNull);

  switch (physicalType) {
    case PQ_TYPE_INT32: {
      const arr = values as Int32Array;
      let mn = arr[0];
      let mx = arr[0];
      for (let i = 1; i < numNonNull; i++) {
        const v = arr[i];
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      const minBytes = new Uint8Array(4);
      const maxBytes = new Uint8Array(4);
      new DataView(minBytes.buffer).setInt32(0, mn, true);
      new DataView(maxBytes.buffer).setInt32(0, mx, true);
      return { minBytes, maxBytes, nullCount };
    }
    case PQ_TYPE_INT64: {
      const arr = values as BigInt64Array;
      let mn = arr[0];
      let mx = arr[0];
      for (let i = 1; i < numNonNull; i++) {
        const v = arr[i];
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      const minBytes = new Uint8Array(8);
      const maxBytes = new Uint8Array(8);
      new DataView(minBytes.buffer).setBigInt64(0, mn, true);
      new DataView(maxBytes.buffer).setBigInt64(0, mx, true);
      return { minBytes, maxBytes, nullCount };
    }
    case PQ_TYPE_FLOAT: {
      const arr = values as Float32Array;
      let mn = arr[0];
      let mx = arr[0];
      for (let i = 1; i < numNonNull; i++) {
        const v = arr[i];
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      const minBytes = new Uint8Array(4);
      const maxBytes = new Uint8Array(4);
      new DataView(minBytes.buffer).setFloat32(0, mn, true);
      new DataView(maxBytes.buffer).setFloat32(0, mx, true);
      return { minBytes, maxBytes, nullCount };
    }
    case PQ_TYPE_DOUBLE: {
      const arr = values as Float64Array;
      let mn = arr[0];
      let mx = arr[0];
      for (let i = 1; i < numNonNull; i++) {
        const v = arr[i];
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      const minBytes = new Uint8Array(8);
      const maxBytes = new Uint8Array(8);
      new DataView(minBytes.buffer).setFloat64(0, mn, true);
      new DataView(maxBytes.buffer).setFloat64(0, mx, true);
      return { minBytes, maxBytes, nullCount };
    }
    case PQ_TYPE_BOOLEAN: {
      // Single byte: 0 = false, 1 = true. min = any false present,
      // else true; max = any true present, else false.
      const arr = values as Uint8Array;
      let anyTrue = false;
      let anyFalse = false;
      for (let i = 0; i < numNonNull && !(anyTrue && anyFalse); i++) {
        if (arr[i]) anyTrue = true;
        else anyFalse = true;
      }
      const mn = anyFalse ? 0 : 1;
      const mx = anyTrue ? 1 : 0;
      return {
        minBytes: new Uint8Array([mn]),
        maxBytes: new Uint8Array([mx]),
        nullCount,
      };
    }
    case PQ_TYPE_BYTE_ARRAY: {
      // utf8 strings. JS string `<` compares by UTF-16 code unit; for
      // BMP code points (anything except surrogate pairs) that order
      // matches the UTF-8 byte order parquet specifies. Track the min
      // and max as JS strings to avoid a per-row TextEncoder + byte
      // compare — encode only the two winners at the end.
      const arr = values as string[];
      let mn = arr[0];
      let mx = arr[0];
      for (let i = 1; i < numNonNull; i++) {
        const v = arr[i];
        if (v < mn) mn = v;
        else if (v > mx) mx = v;
      }
      const enc = new TextEncoder();
      return { minBytes: enc.encode(mn), maxBytes: enc.encode(mx), nullCount };
    }
  }
  return undefined;
}

function cmpBytesLex(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

// Writes a Statistics struct using the v5/v6 (max_value/min_value)
// fields — newer than the deprecated v1/v2 max/min. Downstream readers
// have understood v5/v6 since parquet 2.6 (~2017).
function writeStatistics(s: { minBytes: Uint8Array; maxBytes: Uint8Array; nullCount: bigint }): Uint8Array {
  const tw = new ThriftWriter();
  let lf = 0;
  // 3: null_count
  lf = tw.writeI64(lf, 3, s.nullCount);
  // 5: max_value (binary)
  tw.writeFieldHeader(lf, 5, TC_BINARY);
  lf = 5;
  tw.out.writeVarint(s.maxBytes.length);
  tw.out.writeBytes(s.maxBytes);
  // 6: min_value (binary)
  tw.writeFieldHeader(lf, 6, TC_BINARY);
  lf = 6;
  tw.out.writeVarint(s.minBytes.length);
  tw.out.writeBytes(s.minBytes);
  tw.writeStop();
  return tw.finish();
}

function writePageHeader(
  pageType: number,
  uncompressedSize: number,
  compressedSize: number,
  dataPageHeader: { numValues: number },
): Uint8Array {
  // Each Thrift field write returns the new lastFieldId. Order doesn't
  // matter semantically but we go ascending for deterministic delta packing.
  const tw = new ThriftWriter();
  let lf = 0;
  // 1: PageType
  lf = tw.writeI32(lf, 1, pageType);
  // 2: uncompressed_page_size
  lf = tw.writeI32(lf, 2, uncompressedSize);
  // 3: compressed_page_size
  lf = tw.writeI32(lf, 3, compressedSize);
  // 5: DataPageHeader struct
  tw.writeFieldHeader(lf, 5, TC_STRUCT);
  lf = 5;
  {
    const inner = new ThriftWriter();
    let ilf = 0;
    // 1: num_values
    ilf = inner.writeI32(ilf, 1, dataPageHeader.numValues);
    // 2: encoding (PLAIN = 0)
    ilf = inner.writeI32(ilf, 2, PQ_ENC_PLAIN);
    // 3: definition_level_encoding (RLE = 3)
    ilf = inner.writeI32(ilf, 3, PQ_ENC_RLE);
    // 4: repetition_level_encoding (RLE = 3)
    ilf = inner.writeI32(ilf, 4, PQ_ENC_RLE);
    inner.writeStop();
    tw.out.writeBytes(inner.finish());
  }
  tw.writeStop();
  return tw.finish();
}

function writeColumnMetaData(
  plan: ColumnPlan,
  codec: number,
  compressedSize: number,
  dataPageOffset: bigint,
): Uint8Array {
  const tw = new ThriftWriter();
  let lf = 0;
  // 1: type
  lf = tw.writeI32(lf, 1, plan.physicalType);
  // 2: encodings list
  tw.writeFieldHeader(lf, 2, TC_LIST);
  lf = 2;
  tw.writeListHeader(TC_I32, 2);
  tw.out.writeZigzagI32(PQ_ENC_PLAIN);
  tw.out.writeZigzagI32(PQ_ENC_RLE);
  // 3: path_in_schema list of strings. For primitive columns this
  // is just [name]; for List<primitive> it's [name, "list",
  // "element"] — the Dremel-style nested path identifying the leaf
  // inside the LIST → repeated → leaf pattern.
  tw.writeFieldHeader(lf, 3, TC_LIST);
  lf = 3;
  const path = plan.listOuterOptional !== undefined ? [plan.name, "list", "element"] : [plan.name];
  tw.writeListHeader(TC_BINARY, path.length);
  const enc = new TextEncoder();
  for (const seg of path) {
    const segBytes = enc.encode(seg);
    tw.out.writeVarint(segBytes.length);
    tw.out.writeBytes(segBytes);
  }
  // 4: codec
  lf = tw.writeI32(lf, 4, codec);
  // 5: num_values
  lf = tw.writeI64(lf, 5, BigInt(plan.numValues));
  // 6: total_uncompressed_size (page header bytes + data)
  lf = tw.writeI64(lf, 6, BigInt(plan.uncompressedSize));
  // 7: total_compressed_size
  lf = tw.writeI64(lf, 7, BigInt(compressedSize));
  // 9: data_page_offset
  lf = tw.writeI64(lf, 9, dataPageOffset);
  // 12: statistics (Statistics struct) — only emitted when we have at
  // least one non-null value in the column. Downstream readers ignore
  // missing stats (treat as "unknown").
  if (plan.stats) {
    tw.writeFieldHeader(lf, 12, TC_STRUCT);
    lf = 12;
    tw.out.writeBytes(writeStatistics(plan.stats));
  }
  // 14: bloom_filter_offset, 15: bloom_filter_length — both populated
  // only when the writer was asked to emit a bloom filter for this
  // column AND the filter region was patched in upstream. Length is
  // useful enough that we always emit it when we emit the offset.
  if (plan.bloomFilter !== undefined && plan.bloomFilterOffset !== undefined) {
    lf = tw.writeI64(lf, 14, plan.bloomFilterOffset);
    lf = tw.writeI32(lf, 15, plan.bloomFilter.length);
  }
  tw.writeStop();
  return tw.finish();
}

function writeColumnChunk(plan: ColumnPlan, codec: number, compressedSize: number, dataPageOffset: bigint): Uint8Array {
  const tw = new ThriftWriter();
  let lf = 0;
  // 2: file_offset
  lf = tw.writeI64(lf, 2, dataPageOffset);
  // 3: meta_data (struct)
  tw.writeFieldHeader(lf, 3, TC_STRUCT);
  lf = 3;
  tw.out.writeBytes(writeColumnMetaData(plan, codec, compressedSize, dataPageOffset));
  tw.writeStop();
  return tw.finish();
}

function writeRowGroup(columnChunks: Uint8Array[], numRows: number, totalByteSize: bigint): Uint8Array {
  const tw = new ThriftWriter();
  let lf = 0;
  // 1: columns list of struct
  tw.writeFieldHeader(lf, 1, TC_LIST);
  lf = 1;
  tw.writeListHeader(TC_STRUCT, columnChunks.length);
  for (const cc of columnChunks) {
    tw.out.writeBytes(cc);
  }
  // 2: total_byte_size
  lf = tw.writeI64(lf, 2, totalByteSize);
  // 3: num_rows
  lf = tw.writeI64(lf, 3, BigInt(numRows));
  tw.writeStop();
  return tw.finish();
}

function writeSchemaElement(
  name: string,
  physicalType: number | undefined,
  numChildren: number,
  repetitionType: number | undefined,
  convertedType: number | undefined,
  scale: number | undefined,
  precision: number | undefined,
  typeLength?: number,
): Uint8Array {
  const tw = new ThriftWriter();
  let lf = 0;
  if (physicalType !== undefined) {
    lf = tw.writeI32(lf, 1, physicalType);
  }
  // 2: type_length — required for FIXED_LEN_BYTE_ARRAY, ignored for
  // everything else. Goes BEFORE field 3 (repetition_type) per the
  // Thrift delta-encoded ordering.
  if (typeLength !== undefined) {
    lf = tw.writeI32(lf, 2, typeLength);
  }
  if (repetitionType !== undefined) {
    lf = tw.writeI32(lf, 3, repetitionType);
  }
  lf = tw.writeString(lf, 4, name);
  if (numChildren > 0) {
    lf = tw.writeI32(lf, 5, numChildren);
  }
  // 6: converted_type — pre-2.4 logical-type annotation. We emit it for
  // utf8 (physical BYTE_ARRAY), date32 (physical INT32 + DATE),
  // timestamp_*, and decimal.
  if (convertedType !== undefined) {
    lf = tw.writeI32(lf, 6, convertedType);
  }
  // 9: scale, 10: precision — required for ConvertedType=DECIMAL,
  // unused for everything else. Field ids per parquet.thrift's
  // SchemaElement.
  if (scale !== undefined) {
    lf = tw.writeI32(lf, 9, scale);
  }
  if (precision !== undefined) {
    lf = tw.writeI32(lf, 10, precision);
  }
  tw.writeStop();
  return tw.finish();
}

function writeFileMetaData(cols: ColumnPlan[], numRows: number, rowGroupBytes: Uint8Array): Uint8Array {
  const tw = new ThriftWriter();
  let lf = 0;
  // 1: version
  lf = tw.writeI32(lf, 1, 1);
  // 2: schema list of SchemaElement (root + leaves)
  tw.writeFieldHeader(lf, 2, TC_LIST);
  lf = 2;
  // Total schema-list length: 1 (root) + sum over columns of
  // (3 for list, 1 for primitive). The reader's depth-first walker
  // uses each element's numChildren to navigate.
  let totalSchemaEntries = 1;
  for (const c of cols) totalSchemaEntries += c.listOuterOptional !== undefined ? 3 : 1;
  tw.writeListHeader(TC_STRUCT, totalSchemaEntries);
  // Root group
  tw.out.writeBytes(writeSchemaElement("root", undefined, cols.length, undefined, undefined, undefined, undefined));
  for (const c of cols) {
    if (c.listOuterOptional !== undefined) {
      // Standard 3-level LIST shape:
      //   <repetition> group <name> (LIST) {
      //     repeated group list {
      //       <repetition> <type> element;
      //     }
      //   }
      // Outer group: repetition from listOuterOptional, numChildren=1, ConvertedType=LIST.
      tw.out.writeBytes(
        writeSchemaElement(
          c.name,
          undefined,
          1,
          c.listOuterOptional ? PQ_REP_OPTIONAL : PQ_REP_REQUIRED,
          PQ_CT_LIST,
          undefined,
          undefined,
        ),
      );
      // Middle group: REPEATED, numChildren=1, no converted type.
      tw.out.writeBytes(writeSchemaElement("list", undefined, 1, PQ_REP_REPEATED, undefined, undefined, undefined));
      // Leaf primitive.
      tw.out.writeBytes(
        writeSchemaElement(
          "element",
          c.physicalType,
          0,
          c.listElemOptional ? PQ_REP_OPTIONAL : PQ_REP_REQUIRED,
          c.convertedType,
          c.scale,
          c.precision,
          c.typeLength,
        ),
      );
      continue;
    }
    tw.out.writeBytes(
      writeSchemaElement(
        c.name,
        c.physicalType,
        0,
        c.isOptional ? PQ_REP_OPTIONAL : PQ_REP_REQUIRED,
        c.convertedType,
        c.scale,
        c.precision,
        c.typeLength,
      ),
    );
  }
  // 3: num_rows
  lf = tw.writeI64(lf, 3, BigInt(numRows));
  // 4: row_groups list
  tw.writeFieldHeader(lf, 4, TC_LIST);
  lf = 4;
  tw.writeListHeader(TC_STRUCT, 1);
  tw.out.writeBytes(rowGroupBytes);
  tw.writeStop();
  return tw.finish();
}

// Encode all batches of one List<primitive> column into a single
// data page. Concats child values + validity across batches, walks
// row offsets to build per-element rep+def levels, packs non-null
// child values, and emits the V1 page body:
//
//   [rep RLE i32-prefixed][def RLE i32-prefixed][values PLAIN]
//
// Returns the compressed body, total numLevels (= page numValues),
// and meta needed to populate the ColumnPlan.
function encodeListColumnAcrossBatches(
  field: any,
  ci: number,
  batches: RecordBatchLike[],
  numRows: number,
  codec: number,
): {
  compressed: Uint8Array;
  uncompressedSize: number;
  numLevels: number;
  numNonNull: number;
  innerPhysical: number;
  innerConverted: number | undefined;
  innerTypeLength: number | undefined;
  elemOptional: boolean;
} {
  const listOptional = field.nullable;
  const innerType = field.type.child;
  const elemOptional = field.type.elemNullable === true; // explicit opt-in; default REQUIRED
  const innerKind = innerType.kind;
  if (innerKind === "list") {
    throw new Error("para:arrow.toParquet: nested List<List<...>> not yet supported");
  }
  const innerPhysical = parquetPhysicalForKind(innerKind);
  const innerConverted = parquetConvertedForKind(innerKind);
  const innerTypeLength = innerKind === "fixed_size_binary" ? (innerType as any).width : undefined;

  // Concat across batches.
  type RowSpec = {
    offsets: Int32Array;
    childValues: any;
    childValidity: Uint8Array | undefined;
    rowValidity: Uint8Array | undefined;
  };
  const specs: RowSpec[] = [];
  let totalChild = 0;
  for (const b of batches) {
    const c = b.columns[ci] as any;
    const offsets = c.values as Int32Array;
    const child = c.child;
    if (!child) throw new Error(`para:arrow.toParquet: list column "${field.name}" missing child`);
    const lastOffset = offsets[b.numRows];
    totalChild += lastOffset;
    specs.push({
      offsets,
      childValues: child.values,
      childValidity: child.validity,
      rowValidity: c.validity,
    });
  }

  // Build flat rep/def streams. Worst-case length = numRows + totalChild
  // (one entry per element, plus one entry for each null/empty list).
  const maxLevels = numRows + totalChild;
  const repLevels = new Int32Array(maxLevels);
  const defLevels = new Int32Array(maxLevels);
  // Compute level constants.
  const presentDef = (listOptional ? 1 : 0) + 1 + (elemOptional ? 1 : 0);
  const elemNullDef = (listOptional ? 1 : 0) + 1; // outer non-null + REPEATED
  const emptyDef = listOptional ? 1 : 0;

  // Allocate child value collector. For typed-array kinds we don't know
  // the exact non-null count yet; over-allocate then slice.
  let nonNullValues: any;
  let nonNullCount = 0;
  function appendNonNull(child: any, k: number, sample: any) {
    if (!nonNullValues) {
      // Allocate based on the sample (first batch's child storage).
      const cap = totalChild;
      if (innerTypeLength !== undefined) nonNullValues = new Uint8Array(cap * innerTypeLength);
      else if (sample instanceof Int32Array) nonNullValues = new Int32Array(cap);
      else if (sample instanceof BigInt64Array) nonNullValues = new BigInt64Array(cap);
      else if (sample instanceof Float32Array) nonNullValues = new Float32Array(cap);
      else if (sample instanceof Float64Array) nonNullValues = new Float64Array(cap);
      else if (sample instanceof Uint8Array) nonNullValues = new Uint8Array(cap);
      else nonNullValues = new Array(cap);
    }
    if (innerTypeLength !== undefined) {
      const w = innerTypeLength;
      (nonNullValues as Uint8Array).set((child as Uint8Array).subarray(k * w, (k + 1) * w), nonNullCount * w);
    } else {
      nonNullValues[nonNullCount] = child[k];
    }
    nonNullCount++;
  }

  let levelIdx = 0;
  for (const spec of specs) {
    const { offsets, childValues, childValidity, rowValidity } = spec;
    const batchRows = offsets.length - 1;
    for (let r = 0; r < batchRows; r++) {
      const start = offsets[r];
      const end = offsets[r + 1];
      const rowNull = listOptional && rowValidity && !((rowValidity[r >> 3] >> (r & 7)) & 1);
      if (rowNull) {
        repLevels[levelIdx] = 0;
        defLevels[levelIdx] = 0;
        levelIdx++;
      } else if (start === end) {
        repLevels[levelIdx] = 0;
        defLevels[levelIdx] = emptyDef;
        levelIdx++;
      } else {
        for (let k = start; k < end; k++) {
          const isElemNull = elemOptional && childValidity && !((childValidity[k >> 3] >> (k & 7)) & 1);
          repLevels[levelIdx] = k === start ? 0 : 1;
          defLevels[levelIdx] = isElemNull ? elemNullDef : presentDef;
          if (!isElemNull) appendNonNull(childValues, k, childValues);
          levelIdx++;
        }
      }
    }
  }

  // Trim if we over-allocated nonNullValues.
  if (nonNullValues && innerTypeLength === undefined && nonNullValues.length > nonNullCount) {
    if (Array.isArray(nonNullValues)) {
      nonNullValues = nonNullValues.slice(0, nonNullCount);
    } else {
      // For typed arrays, slice copies — fine for write-once, throw away.
      nonNullValues = (nonNullValues as any).slice(0, nonNullCount);
    }
  } else if (
    nonNullValues &&
    innerTypeLength !== undefined &&
    (nonNullValues as Uint8Array).length > nonNullCount * innerTypeLength
  ) {
    nonNullValues = (nonNullValues as Uint8Array).slice(0, nonNullCount * innerTypeLength);
  }
  if (!nonNullValues) {
    // No non-null elements at all (every row was null/empty). Emit
    // an empty values payload.
    if (innerTypeLength !== undefined) nonNullValues = new Uint8Array(0);
    else nonNullValues = new Int32Array(0);
  }

  const repBitWidth = bitWidthForMax((listOptional ? 1 : 0) + 1); // == 1 (REPEATED contributes 1)
  const defBitWidth = bitWidthForMax(presentDef);

  const repBody = encodeLevelsRle(repLevels, levelIdx, repBitWidth);
  const defBody = encodeLevelsRle(defLevels, levelIdx, defBitWidth);
  const valuesBody = encodePlainTyped(nonNullValues, nonNullCount, innerPhysical, innerTypeLength);

  const w = new ByteWriter();
  w.writeI32LE(repBody.length);
  w.writeBytes(repBody);
  w.writeI32LE(defBody.length);
  w.writeBytes(defBody);
  w.writeBytes(valuesBody);
  const pageBody = w.finish();

  let compressed: Uint8Array;
  if (codec === PQ_CODEC_UNCOMPRESSED) compressed = pageBody;
  else if (codec === PQ_CODEC_SNAPPY) compressed = snappyCompress(pageBody);
  else if (codec === PQ_CODEC_GZIP) compressed = (Bun as any).gzipSync(pageBody) as Uint8Array;
  else if (codec === PQ_CODEC_ZSTD) compressed = (Bun as any).zstdCompressSync(pageBody) as Uint8Array;
  else throw new Error(`parquet: writer codec ${codec} has no compressor wired`);

  return {
    compressed,
    uncompressedSize: pageBody.length,
    numLevels: levelIdx,
    numNonNull: nonNullCount,
    innerPhysical,
    innerConverted,
    innerTypeLength,
    elemOptional,
  };
}

// ─── Public writer entry point ────────────────────────────────────────────

export function toParquet(
  source: TableLike | RecordBatchLike,
  opts?: {
    compression?: "uncompressed" | "snappy" | "gzip" | "zstd";
    /**
     * Column names to emit a bloom filter for. Each named column gets
     * a Split-Block Bloom Filter (SBBF, XxHash64, ~32 KB by default)
     * written between the data pages and the file footer; readers
     * (including readBloomFilters) can use it for row-group-level
     * predicate pushdown without decoding the column.
     *
     * Unrecognised names are silently skipped (no filter emitted).
     * INT96 columns are excluded from the spec — passing one throws.
     */
    bloomFilters?: string[];
  },
): Uint8Array {
  const compression = opts?.compression ?? "snappy";
  let codec = PQ_CODEC_UNCOMPRESSED;
  if (compression === "snappy") codec = PQ_CODEC_SNAPPY;
  else if (compression === "gzip") codec = PQ_CODEC_GZIP;
  else if (compression === "zstd") codec = PQ_CODEC_ZSTD;
  else if (compression !== "uncompressed") {
    throw new RangeError(`para:arrow.toParquet: unknown compression "${compression}"`);
  }
  const bloomCols = new Set<string>(opts?.bloomFilters ?? []);

  // Materialize columns from the source. Concat batches into single
  // typed arrays so we can write one row group.
  const batches: RecordBatchLike[] = "batches" in source ? source.batches : [source];
  const schema = source.schema;
  const numRows = batches.reduce((sum, b) => sum + b.numRows, 0);

  const out = new ByteWriter();
  out.writeBytes(new Uint8Array([0x50, 0x41, 0x52, 0x31])); // PAR1

  // Column chunk metadata is emitted AFTER the bloom-filter region
  // so each chunk can carry its bloom_filter_offset (field 14). We
  // track the per-column data-page offset + compressed size during
  // the page-emission pass and assemble chunks once offsets settle.
  const colPlans: ColumnPlan[] = [];
  const dataPageOffsets: bigint[] = [];
  const compressedSizes: number[] = [];

  for (let ci = 0; ci < schema.fields.length; ci++) {
    const field = schema.fields[ci];
    const isOptional = field.nullable;

    // List columns route to a separate page builder that emits
    // rep+def levels alongside the (packed) inner values. The schema
    // emission also branches: 3 elements per list column (outer LIST
    // group → repeated middle → leaf primitive) instead of 1.
    if (field.type.kind === "list") {
      const result = encodeListColumnAcrossBatches(field, ci, batches, numRows, codec);
      const compressedSize = result.compressed.length;
      const pageHeader = writePageHeader(PQ_PAGE_DATA_PAGE, result.uncompressedSize, compressedSize, {
        numValues: result.numLevels,
      });
      const pageStartOffset = BigInt(out.pos);
      out.writeBytes(pageHeader);
      out.writeBytes(result.compressed);
      const plan: ColumnPlan = {
        name: field.name,
        physicalType: result.innerPhysical,
        convertedType: result.innerConverted,
        precision: undefined,
        scale: undefined,
        typeLength: result.innerTypeLength,
        isOptional,
        listOuterOptional: isOptional,
        listElemOptional: result.elemOptional,
        compressedPage: result.compressed,
        uncompressedSize: result.uncompressedSize + pageHeader.length,
        numValues: result.numLevels,
        numNonNull: result.numNonNull,
        // Stats on list columns aren't well-defined with the current
        // schema (per-element vs per-list). Skip — readers treat
        // missing stats as unknown.
        stats: undefined,
        // Bloom filters for list columns aren't supported in v1 — the
        // semantics ("did the LIST contain this element?") would need
        // hashing each inner value, which is doable but a different
        // contract than "this column has this value." Drop the column
        // from the bloom set rather than emit an empty filter.
        bloomFilter: undefined,
        bloomFilterOffset: undefined,
      };
      colPlans.push(plan);
      dataPageOffsets.push(pageStartOffset);
      compressedSizes.push(compressedSize + pageHeader.length);
      continue;
    }

    const physicalType = parquetPhysicalForKind(field.type.kind);

    // FLBA columns store width bytes per row in a single contiguous
    // Uint8Array — the per-row stride is W, not 1, so the merge math
    // for that case scales offsets by W.
    const flbaW = field.type.kind === "fixed_size_binary" ? (field.type as any).width : undefined;

    // Concat batches' values + validity for this column.
    let mergedValues: any;
    let mergedValidity: Uint8Array | undefined;
    {
      const sample = batches[0].columns[ci];
      if (flbaW !== undefined) {
        // FLBA: numRows × width bytes total.
        mergedValues = new Uint8Array(numRows * flbaW);
      } else if (sample.values instanceof Int32Array) mergedValues = new Int32Array(numRows);
      else if (sample.values instanceof BigInt64Array) mergedValues = new BigInt64Array(numRows);
      else if (sample.values instanceof Float32Array) mergedValues = new Float32Array(numRows);
      else if (sample.values instanceof Float64Array) mergedValues = new Float64Array(numRows);
      else if (sample.values instanceof Uint8Array) mergedValues = new Uint8Array(numRows);
      else mergedValues = new Array(numRows);
      let off = 0;
      for (const b of batches) {
        const c = b.columns[ci];
        if (flbaW !== undefined) {
          // FLBA: copy b.numRows × flbaW bytes at byte-offset off*flbaW.
          (mergedValues as Uint8Array).set(c.values as Uint8Array, off * flbaW);
        } else if (mergedValues.length > 0 && c.values && c.values.length === b.numRows) {
          if (Array.isArray(mergedValues)) {
            for (let i = 0; i < b.numRows; i++) mergedValues[off + i] = c.values[i];
          } else {
            (mergedValues as any).set(c.values, off);
          }
        }
        off += b.numRows;
      }
      if (isOptional) {
        mergedValidity = new Uint8Array(Math.ceil(numRows / 8));
        mergedValidity.fill(0xff);
        let bitOff = 0;
        for (const b of batches) {
          const c = b.columns[ci];
          if (c.validity) {
            for (let i = 0; i < b.numRows; i++) {
              const valid = (c.validity[i >> 3] >> (i & 7)) & 1;
              const out = bitOff + i;
              if (!valid) mergedValidity[out >> 3] &= ~(1 << (out & 7));
            }
          }
          bitOff += b.numRows;
        }
      }
    }

    // FLBA width is `flbaW` from the merge step above.
    const flbaWidth = flbaW;

    // Compute def levels (0/1 per row) and a packed values array (only non-nulls).
    let defLevels: Uint8Array | undefined;
    let nonNullValues: any;
    let numNonNull: number;
    if (isOptional && mergedValidity) {
      defLevels = new Uint8Array(numRows);
      let nn = 0;
      for (let i = 0; i < numRows; i++) {
        const v = (mergedValidity[i >> 3] >> (i & 7)) & 1;
        defLevels[i] = v;
        if (v) nn++;
      }
      numNonNull = nn;
      // Pack non-null values into a fresh array.
      if (flbaWidth !== undefined && mergedValues instanceof Uint8Array) {
        // FLBA: width bytes per row. Pack window-wise.
        const out = new Uint8Array(nn * flbaWidth);
        let j = 0;
        for (let i = 0; i < numRows; i++) {
          if (defLevels[i]) {
            out.set(mergedValues.subarray(i * flbaWidth, (i + 1) * flbaWidth), j * flbaWidth);
            j++;
          }
        }
        nonNullValues = out;
      } else if (mergedValues instanceof Int32Array) {
        const out = new Int32Array(nn);
        let j = 0;
        for (let i = 0; i < numRows; i++) if (defLevels[i]) out[j++] = mergedValues[i];
        nonNullValues = out;
      } else if (mergedValues instanceof BigInt64Array) {
        const out = new BigInt64Array(nn);
        let j = 0;
        for (let i = 0; i < numRows; i++) if (defLevels[i]) out[j++] = mergedValues[i];
        nonNullValues = out;
      } else if (mergedValues instanceof Float32Array) {
        const out = new Float32Array(nn);
        let j = 0;
        for (let i = 0; i < numRows; i++) if (defLevels[i]) out[j++] = mergedValues[i];
        nonNullValues = out;
      } else if (mergedValues instanceof Float64Array) {
        const out = new Float64Array(nn);
        let j = 0;
        for (let i = 0; i < numRows; i++) if (defLevels[i]) out[j++] = mergedValues[i];
        nonNullValues = out;
      } else if (mergedValues instanceof Uint8Array) {
        const out = new Uint8Array(nn);
        let j = 0;
        for (let i = 0; i < numRows; i++) if (defLevels[i]) out[j++] = mergedValues[i];
        nonNullValues = out;
      } else {
        const out: any[] = new Array(nn);
        let j = 0;
        for (let i = 0; i < numRows; i++) if (defLevels[i]) out[j++] = mergedValues[i];
        nonNullValues = out;
      }
    } else {
      numNonNull = numRows;
      nonNullValues = mergedValues;
      defLevels = undefined;
    }

    const pageBody = buildDataPageBody(nonNullValues, numRows, physicalType, defLevels, numNonNull, flbaWidth);
    const uncompressedSize = pageBody.length;
    let compressedBody: Uint8Array;
    if (codec === PQ_CODEC_UNCOMPRESSED) {
      compressedBody = pageBody;
    } else if (codec === PQ_CODEC_SNAPPY) {
      compressedBody = snappyCompress(pageBody);
    } else if (codec === PQ_CODEC_GZIP) {
      compressedBody = (Bun as any).gzipSync(pageBody) as Uint8Array;
    } else if (codec === PQ_CODEC_ZSTD) {
      compressedBody = (Bun as any).zstdCompressSync(pageBody) as Uint8Array;
    } else {
      // Should be unreachable — toParquet validates the option string
      // before mapping to a codec code. Defensive throw to surface any
      // future codec addition that forgets to update this branch.
      throw new Error(`parquet: writer codec ${codec} has no compressor wired`);
    }
    const compressedSize = compressedBody.length;

    const pageHeader = writePageHeader(PQ_PAGE_DATA_PAGE, uncompressedSize, compressedSize, {
      numValues: numRows,
    });
    const pageStartOffset = BigInt(out.pos);
    out.writeBytes(pageHeader);
    out.writeBytes(compressedBody);

    // Decimal columns carry precision + scale on the type object —
    // pull them through onto the column plan so the schema writer
    // can emit fields 9 + 10. Other kinds leave both undefined.
    let precision: number | undefined;
    let scale: number | undefined;
    if (field.type.kind === "decimal128") {
      const dt = field.type as any as { precision: number; scale: number };
      precision = dt.precision;
      scale = dt.scale;
    }
    // Optional bloom filter — built only when the caller asked for
    // one on this column. INT96 is excluded (the spec doesn't define
    // a canonical 12-byte hash for it). The bitmap goes into the
    // plan now; we patch the file offset in below, after all data
    // pages are emitted.
    let bloomBitmap: Uint8Array | undefined;
    if (bloomCols.has(field.name) && numNonNull > 0) {
      if (physicalType === PQ_TYPE_INT96) {
        throw new Error(
          `para:arrow.toParquet: bloom filter requested for INT96 column "${field.name}" — not supported by the parquet spec`,
        );
      }
      bloomBitmap = buildSbbf(nonNullValues, numNonNull, physicalType, flbaWidth);
    }
    const plan: ColumnPlan = {
      name: field.name,
      physicalType,
      convertedType: parquetConvertedForKind(field.type.kind),
      precision,
      scale,
      typeLength: flbaWidth,
      isOptional,
      listOuterOptional: undefined,
      listElemOptional: undefined,
      compressedPage: compressedBody,
      uncompressedSize: uncompressedSize + pageHeader.length,
      numValues: numRows,
      numNonNull,
      // Stats over the *non-null* packed values — that's what the
      // computeColumnStats helper expects. Empty / all-null columns
      // get undefined stats (downstream readers handle "missing
      // stats" as "unknown" already).
      stats: computeColumnStats(nonNullValues, numNonNull, numRows, physicalType),
      bloomFilter: bloomBitmap,
      bloomFilterOffset: undefined,
    };
    colPlans.push(plan);
    dataPageOffsets.push(pageStartOffset);
    compressedSizes.push(compressedSize + pageHeader.length);
  }

  // ─── Bloom filter region ────────────────────────────────────────────
  // Emit one (header + bitmap) blob per requested column, recording the
  // file offset so the column metadata can point at it. The thrift
  // BloomFilterHeader is the canonical SBLOCK + XXHASH + UNCOMPRESSED.
  for (const plan of colPlans) {
    if (!plan.bloomFilter) continue;
    plan.bloomFilterOffset = BigInt(out.pos);
    const tw = new ThriftWriter();
    let lf = 0;
    lf = tw.writeI32(lf, 1, plan.bloomFilter.length); // numBytes
    // 2: algorithm (BloomFilterAlgorithm with field 1 = SplitBlockAlgorithm{})
    tw.writeFieldHeader(lf, 2, TC_STRUCT);
    lf = 2;
    {
      const inner = new ThriftWriter();
      let lf2 = 0;
      inner.writeFieldHeader(lf2, 1, TC_STRUCT);
      lf2 = 1;
      // SplitBlockAlgorithm is empty — just stop.
      const empty = new ThriftWriter();
      empty.writeStop();
      inner.out.writeBytes(empty.finish());
      void lf2;
      inner.writeStop();
      tw.out.writeBytes(inner.finish());
    }
    // 3: hash (BloomFilterHash with field 1 = XxHash{})
    tw.writeFieldHeader(lf, 3, TC_STRUCT);
    lf = 3;
    {
      const inner = new ThriftWriter();
      let lf2 = 0;
      inner.writeFieldHeader(lf2, 1, TC_STRUCT);
      lf2 = 1;
      const empty = new ThriftWriter();
      empty.writeStop();
      inner.out.writeBytes(empty.finish());
      void lf2;
      inner.writeStop();
      tw.out.writeBytes(inner.finish());
    }
    // 4: compression (BloomFilterCompression with field 1 = Uncompressed{})
    tw.writeFieldHeader(lf, 4, TC_STRUCT);
    lf = 4;
    {
      const inner = new ThriftWriter();
      let lf2 = 0;
      inner.writeFieldHeader(lf2, 1, TC_STRUCT);
      lf2 = 1;
      const empty = new ThriftWriter();
      empty.writeStop();
      inner.out.writeBytes(empty.finish());
      void lf2;
      inner.writeStop();
      tw.out.writeBytes(inner.finish());
    }
    tw.writeStop();
    const headerBytes = tw.finish();
    out.writeBytes(headerBytes);
    out.writeBytes(plan.bloomFilter);
  }

  // ─── Column chunks ──────────────────────────────────────────────────
  // Now that bloom-filter offsets are settled, emit each chunk's
  // metadata.
  const columnChunks: Uint8Array[] = [];
  for (let i = 0; i < colPlans.length; i++) {
    columnChunks.push(writeColumnChunk(colPlans[i], codec, compressedSizes[i], dataPageOffsets[i]));
  }

  // Row group metadata uses the totals across columns.
  const totalByteSize = colPlans.reduce((sum, p) => sum + BigInt(p.uncompressedSize), 0n);
  const rowGroup = writeRowGroup(columnChunks, numRows, totalByteSize);

  // FileMetaData footer.
  const meta = writeFileMetaData(colPlans, numRows, rowGroup);
  out.writeBytes(meta);
  out.writeI32LE(meta.length);
  out.writeBytes(new Uint8Array([0x50, 0x41, 0x52, 0x31])); // PAR1
  return out.finish();
}

function parquetPhysicalForKind(kind: string): number {
  switch (kind) {
    case "bool":
      return PQ_TYPE_BOOLEAN;
    case "int32":
    case "date32":
      return PQ_TYPE_INT32;
    case "int64":
    case "timestamp_millis":
    case "timestamp_micros":
    case "decimal128":
      // decimal128 with precision ≤ 18 fits in INT64. Higher
      // precisions (≤ 38) need FIXED_LEN_BYTE_ARRAY backing — pending
      // follow-up; the writer rejects them in toParquet.
      return PQ_TYPE_INT64;
    case "timestamp_nanos":
      // Spark/Impala-era encoding. Newer pipelines use INT64 +
      // TIMESTAMP_NANOS (not yet wired here), but writing INT96
      // round-trips through every parquet reader since 1.x.
      return PQ_TYPE_INT96;
    case "float32":
      return PQ_TYPE_FLOAT;
    case "float64":
      return PQ_TYPE_DOUBLE;
    case "utf8":
      return PQ_TYPE_BYTE_ARRAY;
    case "fixed_size_binary":
      return PQ_TYPE_FIXED_LEN_BYTE_ARRAY;
  }
  throw new Error(`para:arrow.toParquet: type "${kind}" not supported (list / nested types pending)`);
}

// ConvertedType to attach to a column's SchemaElement (field 6) for an
// arrow kind. Returns undefined when no annotation is needed (the
// physical type is unambiguous on its own — int32, float64, etc.).
function parquetConvertedForKind(kind: string): number | undefined {
  switch (kind) {
    case "utf8":
      return PQ_CT_UTF8;
    case "date32":
      return PQ_CT_DATE;
    case "timestamp_millis":
      return PQ_CT_TIMESTAMP_MILLIS;
    case "timestamp_micros":
      return PQ_CT_TIMESTAMP_MICROS;
    case "decimal128":
      return PQ_CT_DECIMAL;
  }
  return undefined;
}
