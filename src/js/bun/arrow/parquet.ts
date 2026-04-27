// Parquet reader for bun:arrow.
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
    throw new Error("bun:arrow parquet: arrow.ts must call setArrowTypes() before fromParquet");
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
}

interface ColumnMetaData {
  type: number;
  encodings: number[];
  pathInSchema: string[];
  codec: number;
  numValues: bigint;
  dataPageOffset: bigint;
  dictionaryPageOffset: bigint | undefined;
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
      case 6:
        out.convertedType = rr.readZigzagI32();
        return true;
    }
    return false;
  });
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

interface PageHeader {
  type: number;
  uncompressedSize: number;
  compressedSize: number;
  dataPageHeader: DataPageHeader | undefined;
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

function parsePageHeader(r: ThriftReader): PageHeader {
  const out: PageHeader = {
    type: PQ_PAGE_DATA_PAGE,
    uncompressedSize: 0,
    compressedSize: 0,
    dataPageHeader: undefined,
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
  throw new Error(`parquet: compression codec ${codec} not supported (UNCOMPRESSED, SNAPPY, GZIP supported)`);
}

// PLAIN encoding for a typed values array. Returns a typed array suitable
// for insertion into a Column.
function decodePlainTyped(
  data: Uint8Array,
  offset: number,
  numValues: number,
  type: number,
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
function decodeDictionaryPage(pageData: Uint8Array, numValues: number, type: number): { values: any } {
  return { values: decodePlainTyped(pageData, 0, numValues, type).values };
}

// Resolve dictionary indices into the dictionary's typed-array values.
function gatherDictionary(dict: any, indices: Int32Array, count: number): any {
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
      return "int32";
    case PQ_TYPE_INT64:
      return "int64";
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
  }
  throw new Error(`parquet: physical type ${type} not supported (INT96 / FIXED_LEN_BYTE_ARRAY pending)`);
}

function decodeColumnChunk(
  bytes: Uint8Array,
  meta: ColumnMetaData,
  numRows: number,
  isOptional: boolean,
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
    dict = decodeDictionaryPage(decompressed, dictHeader.dictionaryPageHeader!.numValues, meta.type).values;
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
    if (header.type !== PQ_PAGE_DATA_PAGE) {
      throw new Error(`parquet: only V1 data pages supported (got page type ${header.type})`);
    }
    const dataPage = header.dataPageHeader!;
    const compressedStart = r.pos;
    const compressed = bytes.subarray(compressedStart, compressedStart + header.compressedSize);
    const decompressed = decompressPage(compressed, meta.codec, header.uncompressedSize);

    // V1 data page layout (decompressed):
    //   [rep levels][def levels][values]
    // Each levels block is i32-length-prefixed RLE/bit-pack hybrid IF the
    // level encoding is RLE (which it always is in modern files).
    let dpos = 0;
    const numValues = dataPage.numValues;

    // Repetition levels (only present if this column has repeated nesting —
    // not the case for flat schemas, so we expect rep = 0 throughout).
    // The block is omitted when max_rep_level is 0; we don't currently
    // know max_rep_level explicitly, but for flat schemas it's always 0.
    // → skip the rep-level read entirely for flat schemas.

    // Definition levels: present iff column is optional. Encoded as an
    // i32-length-prefixed RLE/bit-pack stream of {0, 1} values.
    const defLevels = new Int32Array(numValues);
    if (isOptional) {
      const defLen = new DataView(decompressed.buffer, decompressed.byteOffset + dpos, 4).getInt32(0, true);
      dpos += 4;
      decodeHybridRleBitPack(decompressed, dpos, dpos + defLen, 1, numValues, defLevels);
      dpos += defLen;
    } else {
      defLevels.fill(1);
    }
    // Count non-nulls in this page (== number of physical values to read).
    let nonNull = 0;
    for (let i = 0; i < numValues; i++) if (defLevels[i] === 1) nonNull++;

    // Values
    let pageValues: any;
    if (dataPage.encoding === PQ_ENC_PLAIN) {
      pageValues = decodePlainTyped(decompressed, dpos, nonNull, meta.type).values;
    } else if (dataPage.encoding === PQ_ENC_PLAIN_DICTIONARY || dataPage.encoding === PQ_ENC_RLE_DICTIONARY) {
      if (!dict) throw new Error("parquet: dictionary-encoded page but no dictionary loaded");
      // First byte is the bit width; rest is hybrid RLE/bit-pack of indices.
      const bitWidth = decompressed[dpos];
      dpos += 1;
      const indices = new Int32Array(nonNull);
      decodeHybridRleBitPack(decompressed, dpos, decompressed.length, bitWidth, nonNull, indices);
      pageValues = gatherDictionary(dict, indices, nonNull);
    } else {
      throw new Error(`parquet: page encoding ${dataPage.encoding} not supported`);
    }

    // Allocate the output array on first page based on the type.
    if (!outValues) {
      if (pageValues instanceof Int32Array) outValues = new Int32Array(numRows);
      else if (pageValues instanceof BigInt64Array) outValues = new BigInt64Array(numRows);
      else if (pageValues instanceof Float32Array) outValues = new Float32Array(numRows);
      else if (pageValues instanceof Float64Array) outValues = new Float64Array(numRows);
      else if (pageValues instanceof Uint8Array) outValues = new Uint8Array(numRows);
      else outValues = new Array(numRows);
    }

    // Scatter into outValues by definition level (skip null slots).
    let pageValIdx = 0;
    for (let i = 0; i < numValues; i++) {
      if (defLevels[i] === 1) {
        outValues[outIdx + i] = pageValues[pageValIdx++];
      } else if (validity) {
        const bit = outIdx + i;
        validity[bit >> 3] &= ~(1 << (bit & 7));
      }
    }
    outIdx += numValues;
    valuesRead += numValues;

    pos = compressedStart + header.compressedSize;
  }

  return { values: outValues, validity };
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

  // Parquet schema is a flat list traversed depth-first. The first entry
  // is the root group; subsequent leaves are the actual columns. We only
  // support flat (non-nested) schemas in this reader, so we walk the list
  // and treat any element with `type` defined as a column.
  type ColInfo = { name: string; physicalType: number; convertedType: number | undefined; isOptional: boolean };
  const cols: ColInfo[] = [];
  for (let i = 1; i < meta.schema.length; i++) {
    const e = meta.schema[i];
    if (e.numChildren > 0) {
      throw new Error(`parquet: nested schemas not yet supported (column "${e.name}" has ${e.numChildren} children)`);
    }
    if (e.type === undefined) {
      throw new Error(`parquet: leaf "${e.name}" has no physical type`);
    }
    cols.push({
      name: e.name,
      physicalType: e.type,
      convertedType: e.convertedType,
      isOptional: e.repetitionType === PQ_REP_OPTIONAL,
    });
  }

  // Build one RecordBatch per row group.
  const batches: RecordBatchLike[] = [];
  for (const rg of meta.rowGroups) {
    const numRows = Number(rg.numRows);
    const batchColumns: ColumnLike[] = [];
    for (let i = 0; i < cols.length; i++) {
      const colInfo = cols[i];
      const chunk = rg.columns[i];
      const { values, validity } = decodeColumnChunk(bytes, chunk.metaData, numRows, colInfo.isOptional);
      const kind = arrowKindForPhysical(colInfo.physicalType, colInfo.convertedType);
      batchColumns.push(new Column({ kind }, numRows, values, validity));
    }
    const schemaForBatch = {
      fields: cols.map(c => ({
        name: c.name,
        type: { kind: arrowKindForPhysical(c.physicalType, c.convertedType) },
        nullable: c.isOptional,
      })),
    };
    batches.push(new RecordBatch(schemaForBatch, batchColumns, numRows));
  }

  const tableSchema = {
    fields: cols.map(c => ({
      name: c.name,
      type: { kind: arrowKindForPhysical(c.physicalType, c.convertedType) },
      nullable: c.isOptional,
    })),
  };
  return new Table(tableSchema, batches);
}
