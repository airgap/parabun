import { describe, expect, test } from "bun:test";

// Parquet round-trip tests for para:arrow. Covers the codec matrix
// (UNCOMPRESSED, SNAPPY, GZIP, ZSTD), basic + edge-case schemas, and
// large-row stress to make sure dictionary + def-level paths hold up.
//
// Reader is hand-rolled (Thrift compact protocol decoder + page
// decoder); writer emits a single row group with PLAIN encoding. The
// "round-trip identity" check is the spec compliance test that
// matters: anything we write must come back through our own reader
// byte-identically. Cross-validation against pyarrow / arrow-rs is a
// follow-up benchmark, not a unit test.

describe("para:arrow parquet — codec round-trip", () => {
  test("uncompressed round-trips", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [
      { id: 1, name: "alice", score: 0.5 },
      { id: 2, name: "bob", score: 0.75 },
      { id: 3, name: "carol", score: 0.9 },
    ];
    const batch = arrow.fromRows(rows);
    const bytes = arrow.toParquet(batch, { compression: "uncompressed" });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.subarray(0, 4)).toEqual(new Uint8Array([0x50, 0x41, 0x52, 0x31])); // PAR1
    const decoded = arrow.fromParquet(bytes);
    expect(arrow.toRows(decoded)).toEqual(rows);
  });

  test("snappy round-trips", async () => {
    const arrow = (await import("para:arrow")).default;
    // First-row sentinel `0.5` (not `0`) so type inference picks float64
    // instead of int — `i * 1.5` is fractional from row 1 onward but
    // arrow.fromRows reads the first row to infer the column type.
    const rows = Array.from({ length: 50 }, (_, i) => ({ k: i, v: i * 1.5 + 0.5 }));
    const batch = arrow.fromRows(rows);
    const bytes = arrow.toParquet(batch, { compression: "snappy" });
    const decoded = arrow.fromParquet(bytes);
    expect(arrow.toRows(decoded)).toEqual(rows);
  });

  test("gzip round-trips", async () => {
    const arrow = (await import("para:arrow")).default;
    // First-row sentinel `0.5` (not `0`) so type inference picks float64
    // instead of int — `i * 1.5` is fractional from row 1 onward but
    // arrow.fromRows reads the first row to infer the column type.
    const rows = Array.from({ length: 50 }, (_, i) => ({ k: i, v: i * 1.5 + 0.5 }));
    const batch = arrow.fromRows(rows);
    const bytes = arrow.toParquet(batch, { compression: "gzip" });
    const decoded = arrow.fromParquet(bytes);
    expect(arrow.toRows(decoded)).toEqual(rows);
  });

  test("zstd round-trips", async () => {
    const arrow = (await import("para:arrow")).default;
    // First-row sentinel `0.5` (not `0`) so type inference picks float64
    // instead of int — `i * 1.5` is fractional from row 1 onward but
    // arrow.fromRows reads the first row to infer the column type.
    const rows = Array.from({ length: 50 }, (_, i) => ({ k: i, v: i * 1.5 + 0.5 }));
    const batch = arrow.fromRows(rows);
    const bytes = arrow.toParquet(batch, { compression: "zstd" });
    const decoded = arrow.fromParquet(bytes);
    expect(arrow.toRows(decoded)).toEqual(rows);
  });

  test("zstd compresses better than uncompressed on repeating data", async () => {
    const arrow = (await import("para:arrow")).default;
    // Compressible: long runs of repeating values.
    const rows = Array.from({ length: 1000 }, (_, i) => ({
      bucket: i % 4, // 4 distinct values, 250 each — high redundancy
      label: `bucket-${i % 4}`,
    }));
    const batch = arrow.fromRows(rows);
    const raw = arrow.toParquet(batch, { compression: "uncompressed" });
    const zstd = arrow.toParquet(batch, { compression: "zstd" });
    expect(zstd.length).toBeLessThan(raw.length);
    // Round-trip identity preserved through compression.
    expect(arrow.toRows(arrow.fromParquet(zstd))).toEqual(rows);
  });

  test("unknown compression option throws RangeError", async () => {
    const arrow = (await import("para:arrow")).default;
    const batch = arrow.fromRows([{ x: 1 }]);
    expect(() =>
      // @ts-expect-error — bad codec on purpose
      arrow.toParquet(batch, { compression: "lzma" }),
    ).toThrow(/unknown compression/);
  });
});

describe("para:arrow parquet — schema coverage", () => {
  test("int32 / float64 / utf8 round-trip", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [
      { i: 1, f: 1.5, s: "alpha" },
      { i: 2, f: 2.5, s: "beta" },
      { i: 3, f: 3.5, s: "gamma" },
    ];
    const batch = arrow.fromRows(rows);
    const bytes = arrow.toParquet(batch, { compression: "snappy" });
    expect(arrow.toRows(arrow.fromParquet(bytes))).toEqual(rows);
  });

  test("int64 round-trips through bigint", async () => {
    const arrow = (await import("para:arrow")).default;
    // Force int64 by passing BigInt values explicitly.
    const rows = [
      { id: 1n << 40n, label: "big-1" },
      { id: 2n << 40n, label: "big-2" },
    ];
    const batch = arrow.fromRows(rows);
    const bytes = arrow.toParquet(batch, { compression: "snappy" });
    const back = arrow.toRows(arrow.fromParquet(bytes));
    expect(back[0].id).toBe(1n << 40n);
    expect(back[1].id).toBe(2n << 40n);
  });

  test("boolean round-trips", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [
      { name: "a", active: true },
      { name: "b", active: false },
      { name: "c", active: true },
    ];
    const batch = arrow.fromRows(rows);
    const bytes = arrow.toParquet(batch, { compression: "snappy" });
    expect(arrow.toRows(arrow.fromParquet(bytes))).toEqual(rows);
  });

  test("nullable column round-trips with null preserved at the right rows", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [
      { id: 1, comment: "first" },
      { id: 2, comment: null },
      { id: 3, comment: "third" },
      { id: 4, comment: null },
    ];
    const batch = arrow.fromRows(rows);
    const bytes = arrow.toParquet(batch, { compression: "snappy" });
    expect(arrow.toRows(arrow.fromParquet(bytes))).toEqual(rows);
  });

  test("PAR1 magic at start AND end", async () => {
    const arrow = (await import("para:arrow")).default;
    const batch = arrow.fromRows([{ x: 1 }]);
    const bytes = arrow.toParquet(batch);
    expect(bytes.subarray(0, 4)).toEqual(new Uint8Array([0x50, 0x41, 0x52, 0x31]));
    expect(bytes.subarray(bytes.length - 4)).toEqual(new Uint8Array([0x50, 0x41, 0x52, 0x31]));
  });
});

describe("para:arrow parquet — column statistics", () => {
  // Stats are emitted as field 12 of ColumnMetaData. They aren't
  // surfaced on the JS side of fromParquet (consumers materialize the
  // values directly), so we re-parse the file's footer and pull stats
  // out of the column-chunk metadata to verify them. Hand-rolled
  // re-parse so tests don't depend on private internals of parquet.ts.
  function parseStatsFromFile(bytes: Uint8Array): Map<string, { min: any; max: any; nullCount: bigint }> {
    // Parquet footer layout: ... [FileMetaData bytes] [4-byte LE i32 = footer length] PAR1
    const footerLen = new DataView(bytes.buffer, bytes.byteOffset + bytes.length - 8, 4).getInt32(0, true);
    const footerStart = bytes.length - 8 - footerLen;
    const footer = bytes.subarray(footerStart, footerStart + footerLen);

    // Read varints + zigzag manually — just enough to navigate the
    // column-chunk → meta_data → statistics path.
    let pos = 0;
    function rByte() {
      return footer[pos++];
    }
    function rVarint() {
      let v = 0;
      let shift = 0;
      while (true) {
        const b = rByte();
        v |= (b & 0x7f) << shift;
        if ((b & 0x80) === 0) return v;
        shift += 7;
      }
    }
    function rZigI32() {
      const v = rVarint();
      return (v >>> 1) ^ -(v & 1);
    }
    function rZigI64() {
      // For our test ranges this fits in JS number, but use BigInt
      // for safety on null_count.
      let v = 0n;
      let shift = 0n;
      while (true) {
        const b = BigInt(rByte());
        v |= (b & 0x7fn) << shift;
        if ((b & 0x80n) === 0n) break;
        shift += 7n;
      }
      return (v >> 1n) ^ -(v & 1n);
    }
    function rBytes(n: number) {
      const out = footer.subarray(pos, pos + n);
      pos += n;
      return out;
    }
    function rString() {
      const n = rVarint();
      const out = new TextDecoder().decode(rBytes(n));
      return out;
    }
    // Skip a field of unknown type. Type codes per Thrift compact
    // protocol (matches TC_* in parquet.ts):
    //   1 BOOL_TRUE  2 BOOL_FALSE  3 I8/BYTE  4 I16  5 I32  6 I64
    //   7 DOUBLE  8 BINARY  9 LIST  10 SET  11 MAP  12 STRUCT
    function skip(t: number) {
      if (t === 1 || t === 2) {
        // bool — value is encoded in type tag, no payload
      } else if (t === 3) {
        rByte();
      } else if (t === 4 || t === 5 || t === 6) {
        rZigI32(); // i16 / i32 / i64 all use varint-zigzag (i64 may be longer; rZigI32 reads varint up to 5B; for the meta fields we hit, that's enough — null_count etc. are read explicitly)
      } else if (t === 7) {
        pos += 8; // double — 8 raw bytes
      } else if (t === 8) {
        // binary — varint length + bytes
        const n = rVarint();
        pos += n;
      } else if (t === 9 || t === 10) {
        // list/set — header + elements
        const head = rByte();
        const sz = (head >> 4) & 0xf;
        const sub = head & 0xf;
        const len = sz === 15 ? rVarint() : sz;
        for (let i = 0; i < len; i++) skip(sub);
      } else if (t === 11) {
        // map — varint(size) + key-type|value-type byte + 2*size elements
        const n = rVarint();
        if (n > 0) {
          const tt = rByte();
          const kt = (tt >> 4) & 0xf;
          const vt = tt & 0xf;
          for (let i = 0; i < n; i++) {
            skip(kt);
            skip(vt);
          }
        }
      } else if (t === 12) {
        // struct — recurse until STOP
        let lf = 0;
        while (true) {
          const h = rByte();
          if (h === 0) break;
          const tt = h & 0xf;
          const delta = (h >> 4) & 0xf;
          if (delta === 0) lf = rZigI32();
          else lf += delta;
          skip(tt);
        }
      } else {
        throw new Error(`stats-test parser: unknown skip type ${t}`);
      }
    }
    const out = new Map<string, { min: any; max: any; nullCount: bigint }>();

    // Walk FileMetaData looking for row_groups (field 4) → columns
    // (field 1) → meta_data (field 3) → name (field 3 of meta) +
    // statistics (field 12 of meta).
    let lf = 0;
    while (pos < footer.length) {
      const head = rByte();
      if (head === 0) break;
      const t = head & 0xf;
      const delta = (head >> 4) & 0xf;
      if (delta === 0) lf = rZigI32();
      else lf += delta;
      if (lf === 4 && t === 9) {
        // row_groups list
        const lh = rByte();
        const sz = (lh >> 4) & 0xf;
        const sub = lh & 0xf;
        const len = sz === 15 ? rVarint() : sz;
        if (sub !== 12) throw new Error("stats-test parser: row_groups not list-of-struct");
        for (let i = 0; i < len; i++) {
          // RowGroup struct: walk fields, look for columns (field 1)
          let rgLf = 0;
          while (true) {
            const rh = rByte();
            if (rh === 0) break;
            const rt = rh & 0xf;
            const rdelta = (rh >> 4) & 0xf;
            if (rdelta === 0) rgLf = rZigI32();
            else rgLf += rdelta;
            if (rgLf === 1 && rt === 9) {
              // columns list of ColumnChunk
              const clh = rByte();
              const csz = (clh >> 4) & 0xf;
              const cl = csz === 15 ? rVarint() : csz;
              for (let j = 0; j < cl; j++) {
                let cLf = 0;
                let columnName: string | null = null;
                let stats: { min: any; max: any; nullCount: bigint } | null = null;
                let physicalType = 0;
                while (true) {
                  const ch = rByte();
                  if (ch === 0) break;
                  const ct = ch & 0xf;
                  const cdelta = (ch >> 4) & 0xf;
                  if (cdelta === 0) cLf = rZigI32();
                  else cLf += cdelta;
                  if (cLf === 3 && ct === 12) {
                    // meta_data struct
                    let mLf = 0;
                    while (true) {
                      const mh = rByte();
                      if (mh === 0) break;
                      const mt = mh & 0xf;
                      const mdelta = (mh >> 4) & 0xf;
                      if (mdelta === 0) mLf = rZigI32();
                      else mLf += mdelta;
                      if (mLf === 1) {
                        physicalType = rZigI32();
                      } else if (mLf === 3) {
                        // path_in_schema list of strings
                        const phh = rByte();
                        const phs = (phh >> 4) & 0xf;
                        const phl = phs === 15 ? rVarint() : phs;
                        for (let k = 0; k < phl; k++) {
                          if (k === 0) columnName = rString();
                          else rString();
                        }
                      } else if (mLf === 12) {
                        // statistics struct
                        let sLf = 0;
                        let nullCount = 0n;
                        let maxBytes: Uint8Array | null = null;
                        let minBytes: Uint8Array | null = null;
                        while (true) {
                          const sh = rByte();
                          if (sh === 0) break;
                          const st = sh & 0xf;
                          const sdelta = (sh >> 4) & 0xf;
                          if (sdelta === 0) sLf = rZigI32();
                          else sLf += sdelta;
                          if (sLf === 3) nullCount = rZigI64();
                          else if (sLf === 5) {
                            const n = rVarint();
                            maxBytes = rBytes(n);
                          } else if (sLf === 6) {
                            const n = rVarint();
                            minBytes = rBytes(n);
                          } else skip(st);
                        }
                        const decode = (b: Uint8Array | null) => {
                          if (!b) return null;
                          if (physicalType === 1) return new DataView(b.buffer, b.byteOffset, 4).getInt32(0, true);
                          if (physicalType === 2) return new DataView(b.buffer, b.byteOffset, 8).getBigInt64(0, true);
                          if (physicalType === 4) return new DataView(b.buffer, b.byteOffset, 4).getFloat32(0, true);
                          if (physicalType === 5) return new DataView(b.buffer, b.byteOffset, 8).getFloat64(0, true);
                          if (physicalType === 6) return new TextDecoder().decode(b);
                          if (physicalType === 0) return b[0] === 1;
                          return null;
                        };
                        stats = { min: decode(minBytes), max: decode(maxBytes), nullCount };
                      } else skip(mt);
                    }
                  } else skip(ct);
                }
                if (columnName && stats) out.set(columnName, stats);
              }
            } else skip(rt);
          }
        }
      } else skip(t);
    }
    return out;
  }

  test("int32 column stats: correct min, max, null_count=0", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [{ k: 5 }, { k: 1 }, { k: 9 }, { k: 3 }, { k: 7 }];
    const bytes = arrow.toParquet(arrow.fromRows(rows));
    const stats = parseStatsFromFile(bytes);
    expect(stats.get("k")).toEqual({ min: 1, max: 9, nullCount: 0n });
  });

  test("nullable column stats include null_count and skip nulls in min/max", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [{ v: 10 }, { v: null }, { v: 30 }, { v: null }, { v: 20 }];
    const bytes = arrow.toParquet(arrow.fromRows(rows));
    const stats = parseStatsFromFile(bytes);
    expect(stats.get("v")).toEqual({ min: 10, max: 30, nullCount: 2n });
  });

  test("string column stats use UTF-8 lex order", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [{ s: "banana" }, { s: "apple" }, { s: "cherry" }];
    const bytes = arrow.toParquet(arrow.fromRows(rows));
    const stats = parseStatsFromFile(bytes);
    expect(stats.get("s")).toEqual({ min: "apple", max: "cherry", nullCount: 0n });
  });

  test("float64 column stats round-trip through reader for sin-wave data", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = Array.from({ length: 100 }, (_, i) => ({ x: Math.sin((i + 1) * 0.123) * 100 }));
    const bytes = arrow.toParquet(arrow.fromRows(rows));
    const stats = parseStatsFromFile(bytes);
    const expected = rows.map(r => r.x);
    const actualMin = stats.get("x")!.min as number;
    const actualMax = stats.get("x")!.max as number;
    expect(actualMin).toBeCloseTo(Math.min(...expected), 5);
    expect(actualMax).toBeCloseTo(Math.max(...expected), 5);
  });
});

describe("para:arrow parquet — date32 logical type", () => {
  test("Date values round-trip as Date objects through parquet", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [
      { id: 1, day: new Date("2024-01-15T00:00:00Z") },
      { id: 2, day: new Date("2024-06-30T00:00:00Z") },
      { id: 3, day: new Date("2025-03-01T00:00:00Z") },
    ];
    const bytes = arrow.toParquet(arrow.fromRows(rows), { compression: "zstd" });
    const back = arrow.toRows(arrow.fromParquet(bytes));
    expect(back).toHaveLength(3);
    for (let i = 0; i < rows.length; i++) {
      expect(back[i].id).toBe(rows[i].id);
      expect(back[i].day).toBeInstanceOf(Date);
      expect((back[i].day as Date).toISOString().slice(0, 10)).toBe(rows[i].day.toISOString().slice(0, 10));
    }
  });

  test("inferred column kind is date32, not int32", async () => {
    const arrow = (await import("para:arrow")).default;
    const batch = arrow.fromRows([{ d: new Date("2020-01-01") }]);
    expect(batch.column("d").type.kind).toBe("date32");
  });

  test("decoded column kind is date32 (annotation round-trips)", async () => {
    const arrow = (await import("para:arrow")).default;
    const bytes = arrow.toParquet(arrow.fromRows([{ d: new Date("2020-01-01") }]));
    const decoded = arrow.fromParquet(bytes);
    expect(decoded.batches[0].columns[0].type.kind).toBe("date32");
  });

  test("partial-day timestamp floors to UTC day", async () => {
    const arrow = (await import("para:arrow")).default;
    // Mid-afternoon UTC, mid-evening Pacific — both should land on 2024-01-15.
    const rows = [{ d: new Date("2024-01-15T15:30:45Z") }];
    const bytes = arrow.toParquet(arrow.fromRows(rows));
    const back = arrow.toRows(arrow.fromParquet(bytes));
    expect((back[0].d as Date).toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });

  test("nullable date32 column handles null values", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [
      { id: 1, deadline: new Date("2024-12-31") },
      { id: 2, deadline: null },
      { id: 3, deadline: new Date("2025-06-15") },
    ];
    const bytes = arrow.toParquet(arrow.fromRows(rows));
    const back = arrow.toRows(arrow.fromParquet(bytes));
    expect(back[0].deadline).toBeInstanceOf(Date);
    expect(back[1].deadline).toBeNull();
    expect(back[2].deadline).toBeInstanceOf(Date);
  });

  test("Column.get returns Date for date32 columns", async () => {
    const arrow = (await import("para:arrow")).default;
    const batch = arrow.fromRows([{ d: new Date("2024-07-04") }, { d: new Date("2024-12-25") }]);
    const col = batch.column("d");
    const v0 = col.get(0);
    const v1 = col.get(1);
    expect(v0).toBeInstanceOf(Date);
    expect(v1).toBeInstanceOf(Date);
    expect((v0 as Date).toISOString().slice(0, 10)).toBe("2024-07-04");
    expect((v1 as Date).toISOString().slice(0, 10)).toBe("2024-12-25");
  });
});

describe("para:arrow parquet — timestamp logical types", () => {
  test("timestamp_millis preserves millisecond precision through parquet", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [
      { id: 1, ts: new Date("2024-01-15T15:30:45.123Z") },
      { id: 2, ts: new Date("2024-06-30T08:00:00.999Z") },
    ];
    const batch = arrow.fromRows(rows, { schema: { ts: "timestamp_millis" } });
    expect(batch.column("ts").type.kind).toBe("timestamp_millis");
    const bytes = arrow.toParquet(batch, { compression: "zstd" });
    const decoded = arrow.fromParquet(bytes);
    expect(decoded.batches[0].columns[1].type.kind).toBe("timestamp_millis");
    const back = arrow.toRows(decoded);
    for (let i = 0; i < rows.length; i++) {
      expect(back[i].ts).toBeInstanceOf(Date);
      // ISO string equality includes the .NNN milliseconds.
      expect((back[i].ts as Date).toISOString()).toBe(rows[i].ts.toISOString());
    }
  });

  test("timestamp_micros stores at micro resolution; Date-coerced result floors to ms", async () => {
    const arrow = (await import("para:arrow")).default;
    // Drive raw bigints (in micros) so we exercise sub-ms precision
    // the typed array can hold but JS Date can't expose. Compute the
    // micros from the target Date so the literal can't drift.
    const target = new Date("2024-01-15T15:30:45.123Z");
    const microsExact = BigInt(target.getTime()) * 1000n + 456n; // .123456Z
    const rows = [{ id: 1, ts: microsExact }];
    const batch = arrow.fromRows(rows, { schema: { ts: "timestamp_micros" } });
    const bytes = arrow.toParquet(batch);
    const decoded = arrow.fromParquet(bytes);
    expect(decoded.batches[0].columns[1].type.kind).toBe("timestamp_micros");
    // Raw bigint value round-trips exactly — sub-ms precision intact.
    const col = decoded.batches[0].columns[1];
    expect((col.values as BigInt64Array)[0]).toBe(microsExact);
    // Surfaced as JS Date drops sub-ms (JS Date is ms-resolution) —
    // .123456 floors to .123.
    const back = arrow.toRows(decoded);
    expect((back[0].ts as Date).toISOString()).toBe(target.toISOString());
  });

  test("Date input → timestamp_millis preserves the exact ms timestamp", async () => {
    const arrow = (await import("para:arrow")).default;
    const d = new Date("2024-12-25T14:00:00.555Z");
    const bytes = arrow.toParquet(arrow.fromRows([{ ts: d }], { schema: { ts: "timestamp_millis" } }));
    const back = arrow.toRows(arrow.fromParquet(bytes));
    expect((back[0].ts as Date).toISOString()).toBe(d.toISOString());
  });

  test("Date input → timestamp_micros multiplies ms by 1000", async () => {
    const arrow = (await import("para:arrow")).default;
    const d = new Date("2024-12-25T14:00:00.555Z");
    const batch = arrow.fromRows([{ ts: d }], { schema: { ts: "timestamp_micros" } });
    // Underlying typed array should hold getTime() * 1000 in micros.
    expect((batch.column("ts").values as BigInt64Array)[0]).toBe(BigInt(d.getTime()) * 1000n);
    const bytes = arrow.toParquet(batch);
    const back = arrow.toRows(arrow.fromParquet(bytes));
    expect((back[0].ts as Date).toISOString()).toBe(d.toISOString());
  });

  test("nullable timestamp column handles null values", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [
      { id: 1, ts: new Date("2024-01-01T00:00:00Z") },
      { id: 2, ts: null },
      { id: 3, ts: new Date("2024-12-31T23:59:59.999Z") },
    ];
    const bytes = arrow.toParquet(arrow.fromRows(rows, { schema: { ts: "timestamp_millis" } }));
    const back = arrow.toRows(arrow.fromParquet(bytes));
    expect(back[0].ts).toBeInstanceOf(Date);
    expect(back[1].ts).toBeNull();
    expect(back[2].ts).toBeInstanceOf(Date);
  });

  test("Column.get returns Date for both timestamp variants", async () => {
    const arrow = (await import("para:arrow")).default;
    const d = new Date("2024-07-04T12:34:56.789Z");
    const ms = arrow.fromRows([{ ts: d }], { schema: { ts: "timestamp_millis" } }).column("ts");
    const us = arrow.fromRows([{ ts: d }], { schema: { ts: "timestamp_micros" } }).column("ts");
    expect(ms.get(0)).toBeInstanceOf(Date);
    expect(us.get(0)).toBeInstanceOf(Date);
    expect((ms.get(0) as Date).toISOString()).toBe(d.toISOString());
    expect((us.get(0) as Date).toISOString()).toBe(d.toISOString());
  });

  test("date32 and timestamp_millis are distinct kinds for the same input", async () => {
    const arrow = (await import("para:arrow")).default;
    const d = new Date("2024-07-04T15:30:00Z");
    // Default Date inference → date32.
    const date = arrow.fromRows([{ x: d }]).column("x");
    expect(date.type.kind).toBe("date32");
    // Explicit pin → timestamp_millis.
    const ts = arrow.fromRows([{ x: d }], { schema: { x: "timestamp_millis" } }).column("x");
    expect(ts.type.kind).toBe("timestamp_millis");
    // date32 floors to UTC midnight; timestamp keeps the hour.
    expect((date.get(0) as Date).toISOString()).toBe("2024-07-04T00:00:00.000Z");
    expect((ts.get(0) as Date).toISOString()).toBe(d.toISOString());
  });
});

describe("para:arrow parquet — decimal128 logical type", () => {
  test("string + number + bigint inputs all round-trip as scaled bigint", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [
      { id: 1, price: "12.34" }, // string → 123400 (×10^4)
      { id: 2, price: "0.05" }, // string → 500
      { id: 3, price: 99.99 }, // number → 999900
      { id: 4, price: 1234567890123n }, // bigint passthrough
    ];
    const batch = arrow.fromRows(rows, {
      schema: { price: { kind: "decimal128", precision: 18, scale: 4 } },
    });
    const bytes = arrow.toParquet(batch, { compression: "zstd" });
    const decoded = arrow.fromParquet(bytes);
    const decodedType = decoded.batches[0].columns[1].type as { kind: string; precision: number; scale: number };
    expect(decodedType.kind).toBe("decimal128");
    expect(decodedType.precision).toBe(18);
    expect(decodedType.scale).toBe(4);
    const back = arrow.toRows(decoded);
    expect(back[0].price).toBe(123400n);
    expect(back[1].price).toBe(500n);
    expect(back[2].price).toBe(999900n);
    expect(back[3].price).toBe(1234567890123n);
  });

  test("negative + edge values handled correctly", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [{ x: "-99.99" }, { x: "0" }, { x: "-0.01" }];
    const batch = arrow.fromRows(rows, {
      schema: { x: { kind: "decimal128", precision: 9, scale: 2 } },
    });
    const back = arrow.toRows(arrow.fromParquet(arrow.toParquet(batch)));
    expect(back[0].x).toBe(-9999n);
    expect(back[1].x).toBe(0n);
    expect(back[2].x).toBe(-1n);
  });

  test("scale-truncating string drops sub-scale digits (round-toward-zero)", async () => {
    const arrow = (await import("para:arrow")).default;
    // scale=2 column gets "1.23456" — the .456 is truncated to .45.
    const rows = [{ amt: "1.23456" }];
    const batch = arrow.fromRows(rows, {
      schema: { amt: { kind: "decimal128", precision: 9, scale: 2 } },
    });
    const back = arrow.toRows(arrow.fromParquet(arrow.toParquet(batch)));
    expect(back[0].amt).toBe(123n); // not 1.23456 → 12345; truncated to 1.23 → 123
  });

  test("invalid string throws TypeError", async () => {
    const arrow = (await import("para:arrow")).default;
    expect(() =>
      arrow.fromRows([{ x: "not-a-number" }], {
        schema: { x: { kind: "decimal128", precision: 9, scale: 2 } },
      }),
    ).toThrow(/decimal128 string .* not a valid decimal/);
  });

  test("nullable decimal column handles null values", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [{ price: "10.00" }, { price: null }, { price: "20.00" }];
    const batch = arrow.fromRows(rows, {
      schema: { price: { kind: "decimal128", precision: 9, scale: 2 } },
    });
    const back = arrow.toRows(arrow.fromParquet(arrow.toParquet(batch)));
    expect(back[0].price).toBe(1000n);
    expect(back[1].price).toBeNull();
    expect(back[2].price).toBe(2000n);
  });

  test("precision out of range throws RangeError", async () => {
    const arrow = (await import("para:arrow")).default;
    expect(() =>
      arrow.fromRows([{ x: 1n }], {
        schema: { x: { kind: "decimal128", precision: 25, scale: 0 } }, // > 18
      }),
    ).toThrow(/precision must be 1\.\.18/);
  });

  test("Column.get returns scaled bigint", async () => {
    const arrow = (await import("para:arrow")).default;
    const batch = arrow.fromRows([{ x: "42.00" }], {
      schema: { x: { kind: "decimal128", precision: 9, scale: 2 } },
    });
    expect(batch.column("x").get(0)).toBe(4200n);
  });

  test("schema-element precision + scale survive the round trip", async () => {
    const arrow = (await import("para:arrow")).default;
    const batch = arrow.fromRows([{ amt: 5n }], {
      schema: { amt: { kind: "decimal128", precision: 7, scale: 3 } },
    });
    const decoded = arrow.fromParquet(arrow.toParquet(batch));
    const t = decoded.batches[0].columns[0].type as { precision: number; scale: number };
    expect(t.precision).toBe(7);
    expect(t.scale).toBe(3);
  });
});

describe("para:arrow parquet — INT96 / timestamp_nanos", () => {
  test("nanosecond-precision timestamps round-trip through INT96", async () => {
    const arrow = (await import("para:arrow")).default;
    // Build a Table directly so we can declare the column kind. The
    // BigInt64Array carries nanoseconds since 1970-01-01 UTC.
    const nanos = new BigInt64Array([
      0n, // epoch
      1_700_000_000_000_000_000n, // 2023-11-14T22:13:20Z + nanos
      1_700_000_000_123_456_789n, // sub-microsecond precision
      -1_000_000_000n, // 1969-12-31T23:59:59Z
      -86_400_000_000_000_000n, // 1969-01-01 (negative timestamp)
    ]);
    const col = new arrow.Column({ kind: "timestamp_nanos" }, nanos.length, nanos);
    const batch = new arrow.RecordBatch(
      { fields: [{ name: "ts", type: { kind: "timestamp_nanos" }, nullable: false }] },
      [col],
      nanos.length,
    );
    const tbl = new arrow.Table(batch.schema, [batch]);
    const bytes = arrow.toParquet(tbl, { compression: "uncompressed" });
    const decoded = arrow.fromParquet(bytes);
    expect(decoded.numRows).toBe(nanos.length);
    const back = decoded.batches[0].columns[0].values as BigInt64Array;
    for (let i = 0; i < nanos.length; i++) expect(back[i]).toBe(nanos[i]);
  });

  test("nullable INT96 column preserves null rows", async () => {
    const arrow = (await import("para:arrow")).default;
    const N = 5;
    const nanos = new BigInt64Array([1n, 0n, 1_700_000_000_000_000_000n, 0n, -1_000_000_000n]);
    // Validity bitmap: 1=present. Nulls at indices 1 and 3.
    const validity = new Uint8Array(Math.ceil(N / 8));
    validity[0] = 0b00010101;
    const col = new arrow.Column({ kind: "timestamp_nanos" }, N, nanos, validity);
    const batch = new arrow.RecordBatch(
      { fields: [{ name: "ts", type: { kind: "timestamp_nanos" }, nullable: true }] },
      [col],
      N,
    );
    const tbl = new arrow.Table(batch.schema, [batch]);
    const bytes = arrow.toParquet(tbl, { compression: "uncompressed" });
    const decoded = arrow.fromParquet(bytes);
    const decCol = decoded.batches[0].columns[0];
    expect(decCol.get(0)).toBeInstanceOf(Date);
    expect(decCol.get(1)).toBeNull();
    expect(decCol.get(2)).toBeInstanceOf(Date);
    expect(decCol.get(3)).toBeNull();
    expect(decCol.get(4)).toBeInstanceOf(Date);
    // Spot-check the largest non-null timestamp matches input.
    expect((decCol.values as BigInt64Array)[2]).toBe(1_700_000_000_000_000_000n);
  });
});

describe("para:arrow parquet — FIXED_LEN_BYTE_ARRAY / fixed_size_binary", () => {
  test("16-byte UUID round-trips through FLBA", async () => {
    const arrow = (await import("para:arrow")).default;
    const W = 16;
    const N = 4;
    // 4 UUIDs (each 16 bytes). First two are well-known; rest are
    // arbitrary fixed-byte windows.
    const buf = new Uint8Array(N * W);
    for (let r = 0; r < N; r++) {
      for (let b = 0; b < W; b++) buf[r * W + b] = (r * 31 + b * 7) & 0xff;
    }
    const col = new arrow.Column({ kind: "fixed_size_binary", width: W }, N, buf);
    const batch = new arrow.RecordBatch(
      { fields: [{ name: "uuid", type: { kind: "fixed_size_binary", width: W }, nullable: false }] },
      [col],
      N,
    );
    const tbl = new arrow.Table(batch.schema, [batch]);
    const bytes = arrow.toParquet(tbl, { compression: "uncompressed" });
    const decoded = arrow.fromParquet(bytes);
    expect(decoded.numRows).toBe(N);
    const back = decoded.batches[0].columns[0];
    const t = back.type as { kind: string; width: number };
    expect(t.kind).toBe("fixed_size_binary");
    expect(t.width).toBe(W);
    // Bytes match exactly. Use a regular array for jest-friendly diff.
    expect(Array.from(back.values as Uint8Array)).toEqual(Array.from(buf));
    // Column.get returns a window view of the right width.
    const row0 = back.get(0) as Uint8Array;
    expect(row0.length).toBe(W);
    expect(row0[0]).toBe(0);
  });

  test("8-byte FLBA with nulls preserves null rows as zeroed windows", async () => {
    const arrow = (await import("para:arrow")).default;
    const W = 8;
    const N = 5;
    const buf = new Uint8Array(N * W);
    // Fill row 0, 2, 4 with values; 1 and 3 will be null.
    for (let r of [0, 2, 4]) for (let b = 0; b < W; b++) buf[r * W + b] = (r + 1) * 0x10 + b;
    const validity = new Uint8Array(Math.ceil(N / 8));
    validity[0] = 0b00010101;
    const col = new arrow.Column({ kind: "fixed_size_binary", width: W }, N, buf, validity);
    const batch = new arrow.RecordBatch(
      { fields: [{ name: "tag", type: { kind: "fixed_size_binary", width: W }, nullable: true }] },
      [col],
      N,
    );
    const tbl = new arrow.Table(batch.schema, [batch]);
    const bytes = arrow.toParquet(tbl, { compression: "snappy" });
    const decoded = arrow.fromParquet(bytes);
    const dc = decoded.batches[0].columns[0];
    expect(dc.get(0)).toEqual(buf.subarray(0, W));
    expect(dc.get(1)).toBeNull();
    expect(dc.get(2)).toEqual(buf.subarray(2 * W, 3 * W));
    expect(dc.get(3)).toBeNull();
    expect(dc.get(4)).toEqual(buf.subarray(4 * W, 5 * W));
  });
});

describe("para:arrow parquet — List<primitive>", () => {
  test("List<int32> with REQUIRED outer round-trips through parquet", async () => {
    const arrow = (await import("para:arrow")).default;
    // 3 rows: [10,20,30], [], [40]. Total inner = 4.
    const offsets = new Int32Array([0, 3, 3, 4]);
    const childValues = new Int32Array([10, 20, 30, 40]);
    const child = new arrow.Column({ kind: "int32" }, 4, childValues);
    const listCol = new arrow.Column({ kind: "list", child: { kind: "int32" } }, 3, offsets, undefined, child);
    const batch = new arrow.RecordBatch(
      { fields: [{ name: "nums", type: { kind: "list", child: { kind: "int32" } }, nullable: false }] },
      [listCol],
      3,
    );
    const tbl = new arrow.Table(batch.schema, [batch]);
    const bytes = arrow.toParquet(tbl, { compression: "uncompressed" });
    const decoded = arrow.fromParquet(bytes);
    expect(decoded.numRows).toBe(3);
    const dc = decoded.batches[0].columns[0];
    expect(dc.type.kind).toBe("list");
    expect((dc.type as any).child.kind).toBe("int32");
    expect(dc.get(0)).toEqual([10, 20, 30]);
    expect(dc.get(1)).toEqual([]);
    expect(dc.get(2)).toEqual([40]);
  });

  test("List<int32> OPTIONAL list with null + empty + populated rows", async () => {
    const arrow = (await import("para:arrow")).default;
    // 5 rows: [1,2], null, [], [3], [4,5,6]. Validity bits:
    // 1=present, 0=null. Bit pattern (LSB first): 1,0,1,1,1 → 0b11101.
    const offsets = new Int32Array([0, 2, 2, 2, 3, 6]);
    const childValues = new Int32Array([1, 2, 3, 4, 5, 6]);
    const validity = new Uint8Array(1);
    validity[0] = 0b00011101;
    const child = new arrow.Column({ kind: "int32" }, 6, childValues);
    const listCol = new arrow.Column({ kind: "list", child: { kind: "int32" } }, 5, offsets, validity, child);
    const batch = new arrow.RecordBatch(
      { fields: [{ name: "nums", type: { kind: "list", child: { kind: "int32" } }, nullable: true }] },
      [listCol],
      5,
    );
    const tbl = new arrow.Table(batch.schema, [batch]);
    const bytes = arrow.toParquet(tbl, { compression: "snappy" });
    const decoded = arrow.fromParquet(bytes);
    const dc = decoded.batches[0].columns[0];
    expect(dc.get(0)).toEqual([1, 2]);
    expect(dc.get(1)).toBeNull();
    expect(dc.get(2)).toEqual([]);
    expect(dc.get(3)).toEqual([3]);
    expect(dc.get(4)).toEqual([4, 5, 6]);
  });

  test("List<float64> round-trips with floats including ±0 + Infinity", async () => {
    const arrow = (await import("para:arrow")).default;
    const offsets = new Int32Array([0, 4, 4, 7]);
    const childValues = new Float64Array([1.5, -1.5, 0, -0, Infinity, -Infinity, Math.PI]);
    const child = new arrow.Column({ kind: "float64" }, 7, childValues);
    const listCol = new arrow.Column({ kind: "list", child: { kind: "float64" } }, 3, offsets, undefined, child);
    const batch = new arrow.RecordBatch(
      { fields: [{ name: "nums", type: { kind: "list", child: { kind: "float64" } }, nullable: false }] },
      [listCol],
      3,
    );
    const tbl = new arrow.Table(batch.schema, [batch]);
    const bytes = arrow.toParquet(tbl, { compression: "zstd" });
    const decoded = arrow.fromParquet(bytes);
    const dc = decoded.batches[0].columns[0];
    expect(dc.get(0)).toEqual([1.5, -1.5, 0, -0]);
    expect(dc.get(1)).toEqual([]);
    expect(dc.get(2)).toEqual([Infinity, -Infinity, Math.PI]);
  });

  test("List<utf8> round-trips with strings including unicode", async () => {
    const arrow = (await import("para:arrow")).default;
    const offsets = new Int32Array([0, 2, 5]);
    const childValues = ["alpha", "β", "γαμμα", "δέλτα", "★"];
    const child = new arrow.Column({ kind: "utf8" }, 5, childValues as any);
    const listCol = new arrow.Column({ kind: "list", child: { kind: "utf8" } }, 2, offsets, undefined, child);
    const batch = new arrow.RecordBatch(
      { fields: [{ name: "tags", type: { kind: "list", child: { kind: "utf8" } }, nullable: false }] },
      [listCol],
      2,
    );
    const tbl = new arrow.Table(batch.schema, [batch]);
    const bytes = arrow.toParquet(tbl, { compression: "uncompressed" });
    const decoded = arrow.fromParquet(bytes);
    const dc = decoded.batches[0].columns[0];
    expect(dc.get(0)).toEqual(["alpha", "β"]);
    expect(dc.get(1)).toEqual(["γαμμα", "δέλτα", "★"]);
  });
});

describe("para:arrow parquet — bloom filters", () => {
  test("readBloomFilters returns empty maps when no bloomFilters option was set", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
    ];
    const bytes = arrow.toParquet(arrow.fromRows(rows), { compression: "uncompressed" });
    const filters = arrow.readBloomFilters(bytes);
    expect(filters).toHaveLength(1);
    expect(filters[0].size).toBe(0);
  });

  test("int32 column: every inserted value mightContain (no false negatives)", async () => {
    const arrow = (await import("para:arrow")).default;
    const N = 1_000;
    const rows = Array.from({ length: N }, (_, i) => ({ id: i * 7 + 13, tag: `t${i % 4}` }));
    const bytes = arrow.toParquet(arrow.fromRows(rows), {
      compression: "uncompressed",
      bloomFilters: ["id"],
    });
    const filters = arrow.readBloomFilters(bytes);
    expect(filters).toHaveLength(1);
    const idFilter = filters[0].get("id")!;
    expect(idFilter).toBeDefined();
    expect(idFilter.numBytes).toBeGreaterThanOrEqual(32);
    // No false negatives — every value we wrote must report true.
    for (const r of rows) {
      expect(idFilter.mightContain(r.id)).toBe(true);
    }
  });

  test("int32 column: false-positive rate is reasonable", async () => {
    const arrow = (await import("para:arrow")).default;
    // Insert 1000 values, probe 10000 values that aren't in the set.
    // Expect FPR well below 5% — default 32 KB filter has plenty of
    // capacity at 1K NDV (~10⁻⁵ theoretical FPR).
    const N = 1_000;
    const rows = Array.from({ length: N }, (_, i) => ({ id: i * 7 + 13 }));
    const bytes = arrow.toParquet(arrow.fromRows(rows), {
      compression: "uncompressed",
      bloomFilters: ["id"],
    });
    const filter = arrow.readBloomFilters(bytes)[0].get("id")!;
    const inserted = new Set(rows.map(r => r.id));
    let fp = 0;
    let probed = 0;
    for (let v = 1_000_000; v < 1_010_000; v++) {
      if (inserted.has(v)) continue;
      probed++;
      if (filter.mightContain(v)) fp++;
    }
    const fpr = fp / probed;
    expect(fpr).toBeLessThan(0.05);
  });

  test("utf8 column: strings round-trip through the bloom filter", async () => {
    const arrow = (await import("para:arrow")).default;
    const tags = ["alpha", "β", "γαμμα", "test", "data", "bloom", "filter", "★"];
    const rows = tags.map((t, i) => ({ id: i, tag: t }));
    const bytes = arrow.toParquet(arrow.fromRows(rows), {
      compression: "snappy",
      bloomFilters: ["tag"],
    });
    const tagFilter = arrow.readBloomFilters(bytes)[0].get("tag")!;
    for (const t of tags) {
      expect(tagFilter.mightContain(t)).toBe(true);
    }
    // Some absent strings should miss.
    expect(tagFilter.mightContain("definitely-not-in-the-set-12345")).toBe(false);
  });

  test("multiple columns: independent filters per column", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = Array.from({ length: 100 }, (_, i) => ({
      uid: i + 1000,
      sku: `SKU-${i}`,
      qty: i % 10,
    }));
    const bytes = arrow.toParquet(arrow.fromRows(rows), {
      compression: "snappy",
      bloomFilters: ["uid", "sku"],
    });
    const m = arrow.readBloomFilters(bytes)[0];
    expect(m.has("uid")).toBe(true);
    expect(m.has("sku")).toBe(true);
    expect(m.has("qty")).toBe(false); // not requested
    expect(m.get("uid")!.mightContain(1042)).toBe(true);
    expect(m.get("uid")!.mightContain(99)).toBe(false);
    expect(m.get("sku")!.mightContain("SKU-42")).toBe(true);
    expect(m.get("sku")!.mightContain("SKU-99999")).toBe(false);
  });

  test("the data round-trips correctly when bloom filters are enabled", async () => {
    const arrow = (await import("para:arrow")).default;
    const rows = Array.from({ length: 500 }, (_, i) => ({ id: i, label: `item-${i}` }));
    const bytes = arrow.toParquet(arrow.fromRows(rows), {
      compression: "zstd",
      bloomFilters: ["id", "label"],
    });
    const back = arrow.toRows(arrow.fromParquet(bytes));
    expect(back).toEqual(rows);
  });

  test("INT96 column rejects bloom-filter request (spec-defined)", async () => {
    const arrow = (await import("para:arrow")).default;
    const N = 4;
    const nanos = new BigInt64Array([0n, 1_000_000_000n, 2_000_000_000n, 3_000_000_000n]);
    const col = new arrow.Column({ kind: "timestamp_nanos" }, N, nanos);
    const batch = new arrow.RecordBatch(
      { fields: [{ name: "ts", type: { kind: "timestamp_nanos" }, nullable: false }] },
      [col],
      N,
    );
    const tbl = new arrow.Table(batch.schema, [batch]);
    expect(() => arrow.toParquet(tbl, { compression: "uncompressed", bloomFilters: ["ts"] })).toThrow(
      /INT96.*not supported/,
    );
  });
});

describe("para:arrow parquet — Struct", () => {
  test("Struct<int32, utf8> round-trips through parquet", async () => {
    const arrow = (await import("para:arrow")).default;
    const N = 4;
    const ids = new Int32Array([10, 20, 30, 40]);
    const names = ["alpha", "beta", "gamma", "delta"];
    const idCol = new arrow.Column({ kind: "int32" }, N, ids);
    const nameCol = new arrow.Column({ kind: "utf8" }, N, names as any);
    const structType = {
      kind: "struct",
      fields: [
        { name: "id", type: { kind: "int32" }, nullable: false },
        { name: "name", type: { kind: "utf8" }, nullable: false },
      ],
    };
    const structCol = new arrow.Column(structType, N, new Uint8Array(0), undefined, undefined, [idCol, nameCol]);
    const batch = new arrow.RecordBatch(
      { fields: [{ name: "person", type: structType, nullable: false }] },
      [structCol],
      N,
    );
    const tbl = new arrow.Table(batch.schema, [batch]);
    const bytes = arrow.toParquet(tbl, { compression: "uncompressed" });
    const decoded = arrow.fromParquet(bytes);
    expect(decoded.numRows).toBe(N);
    const dc = decoded.batches[0].columns[0];
    expect(dc.type.kind).toBe("struct");
    expect(dc.get(0)).toEqual({ id: 10, name: "alpha" });
    expect(dc.get(1)).toEqual({ id: 20, name: "beta" });
    expect(dc.get(2)).toEqual({ id: 30, name: "gamma" });
    expect(dc.get(3)).toEqual({ id: 40, name: "delta" });
  });

  test("Struct with nullable inner field preserves nulls", async () => {
    const arrow = (await import("para:arrow")).default;
    const N = 4;
    const ids = new Int32Array([1, 2, 3, 4]);
    const tags = ["a", "", "c", ""]; // indices 1 + 3 are null per the bitmap below
    const tagValidity = new Uint8Array(1);
    tagValidity[0] = 0b00000101; // bits 0,2 set → tags 0,2 are present
    const idCol = new arrow.Column({ kind: "int32" }, N, ids);
    const tagCol = new arrow.Column({ kind: "utf8" }, N, tags as any, tagValidity);
    const structType = {
      kind: "struct",
      fields: [
        { name: "id", type: { kind: "int32" }, nullable: false },
        { name: "tag", type: { kind: "utf8" }, nullable: true },
      ],
    };
    const structCol = new arrow.Column(structType, N, new Uint8Array(0), undefined, undefined, [idCol, tagCol]);
    const batch = new arrow.RecordBatch(
      { fields: [{ name: "row", type: structType, nullable: false }] },
      [structCol],
      N,
    );
    const tbl = new arrow.Table(batch.schema, [batch]);
    const bytes = arrow.toParquet(tbl, { compression: "snappy" });
    const decoded = arrow.fromParquet(bytes);
    const dc = decoded.batches[0].columns[0];
    expect(dc.get(0)).toEqual({ id: 1, tag: "a" });
    expect(dc.get(1)).toEqual({ id: 2, tag: null });
    expect(dc.get(2)).toEqual({ id: 3, tag: "c" });
    expect(dc.get(3)).toEqual({ id: 4, tag: null });
  });

  test("Struct alongside primitive columns in the same row group", async () => {
    const arrow = (await import("para:arrow")).default;
    const N = 3;
    const seqs = new Int32Array([100, 200, 300]);
    const xs = new Float64Array([1.5, 2.5, 3.5]);
    const ys = new Float64Array([-1.5, -2.5, -3.5]);
    const seqCol = new arrow.Column({ kind: "int32" }, N, seqs);
    const xCol = new arrow.Column({ kind: "float64" }, N, xs);
    const yCol = new arrow.Column({ kind: "float64" }, N, ys);
    const ptType = {
      kind: "struct",
      fields: [
        { name: "x", type: { kind: "float64" }, nullable: false },
        { name: "y", type: { kind: "float64" }, nullable: false },
      ],
    };
    const ptCol = new arrow.Column(ptType, N, new Uint8Array(0), undefined, undefined, [xCol, yCol]);
    const batch = new arrow.RecordBatch(
      {
        fields: [
          { name: "seq", type: { kind: "int32" }, nullable: false },
          { name: "pt", type: ptType, nullable: false },
        ],
      },
      [seqCol, ptCol],
      N,
    );
    const tbl = new arrow.Table(batch.schema, [batch]);
    const bytes = arrow.toParquet(tbl, { compression: "zstd" });
    const decoded = arrow.fromParquet(bytes);
    expect(decoded.numRows).toBe(N);
    const seqDecoded = decoded.batches[0].columns[0];
    const ptDecoded = decoded.batches[0].columns[1];
    expect(seqDecoded.get(0)).toBe(100);
    expect(seqDecoded.get(2)).toBe(300);
    expect(ptDecoded.get(0)).toEqual({ x: 1.5, y: -1.5 });
    expect(ptDecoded.get(1)).toEqual({ x: 2.5, y: -2.5 });
    expect(ptDecoded.get(2)).toEqual({ x: 3.5, y: -3.5 });
  });

  test("OPTIONAL struct throws — only REQUIRED structs supported by writer", async () => {
    const arrow = (await import("para:arrow")).default;
    const N = 1;
    const idCol = new arrow.Column({ kind: "int32" }, N, new Int32Array([1]));
    const structType = {
      kind: "struct",
      fields: [{ name: "id", type: { kind: "int32" }, nullable: false }],
    };
    const structCol = new arrow.Column(structType, N, new Uint8Array(0), undefined, undefined, [idCol]);
    const batch = new arrow.RecordBatch(
      { fields: [{ name: "row", type: structType, nullable: true }] },
      [structCol],
      N,
    );
    const tbl = new arrow.Table(batch.schema, [batch]);
    expect(() => arrow.toParquet(tbl)).toThrow(/OPTIONAL struct/);
  });
});

describe("para:arrow parquet — Map", () => {
  test("Map<utf8, int32> round-trips through parquet", async () => {
    const arrow = (await import("para:arrow")).default;
    // 3 rows: {"a": 1, "b": 2}, {}, {"c": 3, "d": 4, "e": 5}.
    const offsets = new Int32Array([0, 2, 2, 5]);
    const keys = ["a", "b", "c", "d", "e"];
    const values = new Int32Array([1, 2, 3, 4, 5]);
    const keyCol = new arrow.Column({ kind: "utf8" }, 5, keys as any);
    const valCol = new arrow.Column({ kind: "int32" }, 5, values);
    const structType = {
      kind: "struct",
      fields: [
        { name: "key", type: { kind: "utf8" }, nullable: false },
        { name: "value", type: { kind: "int32" }, nullable: false },
      ],
    };
    const structCol = new arrow.Column(structType, 5, new Uint8Array(0), undefined, undefined, [keyCol, valCol]);
    const mapType = { kind: "map", keyType: { kind: "utf8" }, valueType: { kind: "int32" }, valueNullable: false };
    const mapCol = new arrow.Column(mapType, 3, offsets, undefined, structCol);
    const batch = new arrow.RecordBatch({ fields: [{ name: "props", type: mapType, nullable: false }] }, [mapCol], 3);
    const tbl = new arrow.Table(batch.schema, [batch]);
    const bytes = arrow.toParquet(tbl, { compression: "uncompressed" });
    const decoded = arrow.fromParquet(bytes);
    expect(decoded.numRows).toBe(3);
    const dc = decoded.batches[0].columns[0];
    expect(dc.type.kind).toBe("map");
    const m0 = dc.get(0) as Map<string, number>;
    expect(m0).toBeInstanceOf(Map);
    expect(Array.from(m0.entries())).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
    const m1 = dc.get(1) as Map<string, number>;
    expect(m1.size).toBe(0);
    const m2 = dc.get(2) as Map<string, number>;
    expect(Array.from(m2.entries())).toEqual([
      ["c", 3],
      ["d", 4],
      ["e", 5],
    ]);
  });

  test("Map with OPTIONAL value preserves null values per key", async () => {
    const arrow = (await import("para:arrow")).default;
    // 2 rows: {"x": 10, "y": null}, {"z": null}.
    const offsets = new Int32Array([0, 2, 3]);
    const keys = ["x", "y", "z"];
    const valuesArr = new Int32Array([10, 0, 0]);
    const valValidity = new Uint8Array(1);
    valValidity[0] = 0b00000001; // only index 0 (x→10) is present
    const keyCol = new arrow.Column({ kind: "utf8" }, 3, keys as any);
    const valCol = new arrow.Column({ kind: "int32" }, 3, valuesArr, valValidity);
    const structType = {
      kind: "struct",
      fields: [
        { name: "key", type: { kind: "utf8" }, nullable: false },
        { name: "value", type: { kind: "int32" }, nullable: true },
      ],
    };
    const structCol = new arrow.Column(structType, 3, new Uint8Array(0), undefined, undefined, [keyCol, valCol]);
    const mapType = { kind: "map", keyType: { kind: "utf8" }, valueType: { kind: "int32" }, valueNullable: true };
    const mapCol = new arrow.Column(mapType, 2, offsets, undefined, structCol);
    const batch = new arrow.RecordBatch({ fields: [{ name: "m", type: mapType, nullable: false }] }, [mapCol], 2);
    const tbl = new arrow.Table(batch.schema, [batch]);
    const bytes = arrow.toParquet(tbl, { compression: "snappy" });
    const decoded = arrow.fromParquet(bytes);
    const dc = decoded.batches[0].columns[0];
    const m0 = dc.get(0) as Map<string, number | null>;
    expect(m0.get("x")).toBe(10);
    expect(m0.get("y")).toBeNull();
    const m1 = dc.get(1) as Map<string, number | null>;
    expect(m1.get("z")).toBeNull();
  });
});

describe("para:arrow parquet — scale", () => {
  test("25K-row table round-trips through zstd", async () => {
    const arrow = (await import("para:arrow")).default;
    // 25K is plenty to exercise the level-encoding + dictionary
    // pathways at scale without timing out the debug+ASAN build.
    // Production / release builds run this size in tens of ms.
    const N = 25_000;
    // Magnitude ≠ 0 at row 0 so the inferred column type is float64.
    const rows = Array.from({ length: N }, (_, i) => ({
      seq: i,
      magnitude: Math.sin((i + 1) * 0.0123) * 100,
      tag: `t${i % 16}`,
    }));
    const batch = arrow.fromRows(rows);
    const bytes = arrow.toParquet(batch, { compression: "zstd" });
    expect(bytes.length).toBeGreaterThan(0);
    const decoded = arrow.fromParquet(bytes);
    expect(decoded.numRows).toBe(N);
    // Spot-check three rows so we're not pulling 100K objects through expect().
    const back = arrow.toRows(decoded);
    expect(back[0]).toEqual(rows[0]);
    expect(back[N - 1]).toEqual(rows[N - 1]);
    expect(back[N >> 1]).toEqual(rows[N >> 1]);
  });
});
