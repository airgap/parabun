import { describe, expect, test } from "bun:test";

// Parallel chunk-and-merge sort tests. Two halves: correctness +
// fallback-decision. We don't measure speedup here — that's a bench
// concern; tests just confirm the algorithm produces what native sort
// produces (same elements, same order, including stable tie-break).

describe("para:parallel.psort — correctness", () => {
  test("empty + single-element arrays return a copy unchanged", async () => {
    const parallel = (await import("para:parallel")).default;
    expect(await parallel.psort([])).toEqual([]);
    expect(await parallel.psort([42])).toEqual([42]);
    // Returns a new array, doesn't mutate input.
    const input = [1];
    const out = await parallel.psort(input);
    expect(out).not.toBe(input);
    await parallel.disposeWorkers();
  });

  test("matches native sort on a small object array (forced parallel)", async () => {
    const parallel = (await import("para:parallel")).default;
    // 8 chunks × 8 elements = 64 elements, comfortably exercising the
    // chunked path even past PSORT_SERIAL_THRESHOLD's small-array
    // cutoff.
    const arr = Array.from({ length: 64 }, (_, i) => ({ id: i, key: 64 - i }));
    const cmp = (a: any, b: any) => a.key - b.key;
    const native = arr.slice().sort(cmp);
    const ps = await parallel.psort(arr, cmp, { concurrency: 8 });
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("matches native sort on a large object array (passes the threshold)", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 8_000;
    const arr = Array.from({ length: N }, (_, i) => ({ id: i, k: (i * 16807) % 65521 }));
    const cmp = (a: any, b: any) => a.k - b.k;
    const native = arr.slice().sort(cmp);
    const ps = await parallel.psort(arr, cmp);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("stable tie-break: ties preserve original input order across chunk boundaries", async () => {
    const parallel = (await import("para:parallel")).default;
    // Lots of ties (key = i % 4) with ids spanning multiple chunks. A
    // stable sort produces ids 0, 4, 8, …, 1, 5, 9, …, etc.
    const N = 6_000;
    const arr = Array.from({ length: N }, (_, i) => ({ id: i, key: i % 4 }));
    const ps = await parallel.psort(arr, (a, b) => a.key - b.key, { concurrency: 8 });
    expect(ps).toHaveLength(N);
    // Group by key, verify each group's ids are strictly increasing
    // (== original input order preserved on ties).
    const groups = new Map<number, number[]>();
    for (const x of ps) {
      const ids = groups.get(x.key) ?? [];
      ids.push(x.id);
      groups.set(x.key, ids);
    }
    for (const [, ids] of groups) {
      for (let i = 1; i < ids.length; i++) {
        expect(ids[i]).toBeGreaterThan(ids[i - 1]);
      }
    }
    await parallel.disposeWorkers();
  });

  test("default sort (no comparator) falls back to native and works correctly", async () => {
    const parallel = (await import("para:parallel")).default;
    // No comparator → serial fallback (psort can't beat native default
    // sort over postMessage cost). Verify result is still correct.
    const arr = ["banana", "apple", "cherry", "date"];
    const ps = await parallel.psort(arr);
    expect(ps).toEqual(["apple", "banana", "cherry", "date"]);
    expect(ps).not.toBe(arr);
    await parallel.disposeWorkers();
  });

  test("preserves all elements (no drops, no duplicates) across chunk boundaries", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 5_000;
    const arr = Array.from({ length: N }, (_, i) => ({ id: i, k: Math.random() }));
    const ps = await parallel.psort(arr, (a, b) => a.k - b.k, { concurrency: 8 });
    const ids = new Set(ps.map(x => x.id));
    expect(ids.size).toBe(N);
    for (let i = 0; i < N; i++) expect(ids.has(i)).toBe(true);
    await parallel.disposeWorkers();
  });

  test("sorted output is monotonic under the comparator", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 7_500;
    const arr = Array.from({ length: N }, (_, i) => ({ id: i, k: (i * 9301 + 49297) % 233280 | 0 }));
    const ps = await parallel.psort(arr, (a, b) => a.k - b.k);
    for (let i = 1; i < ps.length; i++) {
      expect(ps[i].k).toBeGreaterThanOrEqual(ps[i - 1].k);
    }
    await parallel.disposeWorkers();
  });

  test("uneven chunk sizes (concurrency that doesn't divide N evenly)", async () => {
    const parallel = (await import("para:parallel")).default;
    // 5_001 / 7 = 714.43 — last chunk will be short. Verify the merge
    // still produces a correct result.
    const N = 5_001;
    const arr = Array.from({ length: N }, (_, i) => ({ id: i, k: N - i }));
    const ps = await parallel.psort(arr, (a, b) => a.k - b.k, { concurrency: 7 });
    expect(ps).toHaveLength(N);
    // Sort is correct: ascending k means descending id.
    for (let i = 0; i < N; i++) {
      expect(ps[i].id).toBe(N - 1 - i);
    }
    await parallel.disposeWorkers();
  });
});

describe("para:parallel.psort — sample-sort strategy", () => {
  test("matches native sort across worker count + chunk boundaries", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 6_000;
    const arr = Array.from({ length: N }, (_, i) => ({ id: i, k: (i * 16807) % 65521 }));
    const cmp = (a: any, b: any) => a.k - b.k;
    const native = arr.slice().sort(cmp);
    const ps = await parallel.psort(arr, cmp, { strategy: "sample", concurrency: 8 });
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("preserves all elements + monotonic + no duplicates", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 8_000;
    const arr = Array.from({ length: N }, (_, i) => ({ id: i, k: Math.random() * 1000 }));
    const ps = await parallel.psort(arr, (a, b) => a.k - b.k, { strategy: "sample" });
    expect(ps).toHaveLength(N);
    const ids = new Set(ps.map(x => x.id));
    expect(ids.size).toBe(N);
    for (let i = 1; i < ps.length; i++) expect(ps[i].k).toBeGreaterThanOrEqual(ps[i - 1].k);
    await parallel.disposeWorkers();
  });

  test("stable on ties — equal-key elements preserve original order", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 5_000;
    // Lots of ties (key = i % 8) spread across multiple chunks. Stable
    // sort must produce strictly-increasing ids within each tie group.
    const arr = Array.from({ length: N }, (_, i) => ({ id: i, key: i % 8 }));
    const ps = await parallel.psort(arr, (a, b) => a.key - b.key, { strategy: "sample" });
    const groups = new Map<number, number[]>();
    for (const x of ps) {
      const ids = groups.get(x.key) ?? [];
      ids.push(x.id);
      groups.set(x.key, ids);
    }
    for (const [, ids] of groups) {
      for (let i = 1; i < ids.length; i++) {
        expect(ids[i]).toBeGreaterThan(ids[i - 1]);
      }
    }
    await parallel.disposeWorkers();
  });

  test("handles uneven bucket sizes (skewed key distribution)", async () => {
    const parallel = (await import("para:parallel")).default;
    // 80% of keys cluster low; 20% high. Splitter sampling should
    // handle this by giving the dense range smaller buckets and the
    // sparse range larger ones; the algorithm must still produce a
    // correctly sorted output.
    const N = 6_000;
    const arr: { id: number; k: number }[] = [];
    for (let i = 0; i < N; i++) {
      arr.push({ id: i, k: Math.random() < 0.8 ? Math.random() * 100 : 1000 + Math.random() * 9000 });
    }
    const native = arr.slice().sort((a, b) => a.k - b.k);
    const ps = await parallel.psort(arr, (a, b) => a.k - b.k, { strategy: "sample" });
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });
});

describe("para:parallel.psort — typed-array radix path", () => {
  test("Uint8Array sorts correctly", async () => {
    const parallel = (await import("para:parallel")).default;
    const arr = new Uint8Array([5, 1, 255, 0, 200, 17, 17, 99]);
    const native = new Uint8Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("Int8Array sorts correctly across the negative→positive boundary", async () => {
    const parallel = (await import("para:parallel")).default;
    const arr = new Int8Array([-128, 127, 0, -1, 1, -64, 63, -127]);
    const native = new Int8Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("Uint16Array sorts correctly across the byte boundary", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 4_000;
    const arr = new Uint16Array(N);
    for (let i = 0; i < N; i++) arr[i] = (i * 16807) & 0xffff;
    const native = new Uint16Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("Int16Array sorts correctly across the negative→positive boundary", async () => {
    const parallel = (await import("para:parallel")).default;
    const arr = new Int16Array([-32768, 32767, 0, -1, 1, -16384, 16383, -32767]);
    const native = new Int16Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("Uint32Array sorts correctly", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 5_000;
    const arr = new Uint32Array(N);
    for (let i = 0; i < N; i++) arr[i] = ((i * 2654435761) >>> 0) & 0xffffffff;
    const native = new Uint32Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("Int32Array sorts correctly across the negative→positive boundary", async () => {
    const parallel = (await import("para:parallel")).default;
    const arr = new Int32Array([-2147483648, 2147483647, 0, -1, 1, -100, 100, -2147483647]);
    const native = new Int32Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("Float32Array sorts correctly across negatives, zero, positives, ±Infinity", async () => {
    const parallel = (await import("para:parallel")).default;
    const arr = new Float32Array([
      -Infinity,
      3.14,
      -3.14,
      0,
      -0,
      1.5,
      -1.5,
      Math.PI,
      -Math.PI,
      Infinity,
      1e-30,
      -1e-30,
      1e30,
      -1e30,
    ]);
    const native = new Float32Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("Float32Array large random sorts correctly", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 8_000;
    const arr = new Float32Array(N);
    for (let i = 0; i < N; i++) arr[i] = (Math.random() - 0.5) * 1e9;
    const native = new Float32Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  // The next 3 tests cross the PARALLEL_RADIX_MIN_N thresholds (4M
  // for u32/i32, 10M for f32 — see the threshold comment in
  // parallel.ts) so they actually exercise the SAB-backed worker
  // fanout path rather than just the serial radix. Generous timeout
  // because debug+ASAN sorts 5-11M elements well past the default
  // 5s budget.
  test("Uint32Array N=5M crosses the parallel-radix threshold and matches native", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 5_000_000;
    const arr = new Uint32Array(N);
    // Reproducible LCG.
    let s = 0xdeadbeef;
    for (let i = 0; i < N; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      arr[i] = s;
    }
    const native = new Uint32Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  }, 30_000);

  test("Int32Array N=5M parallel sort with negatives matches native", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 5_000_000;
    const arr = new Int32Array(N);
    let s = 0xfeedface;
    for (let i = 0; i < N; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      arr[i] = s | 0;
    }
    const native = new Int32Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  }, 30_000);

  test("Float32Array N=11M parallel sort matches native across negatives + positives + ±Inf", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 11_000_000;
    const arr = new Float32Array(N);
    let s = 0xcafebabe;
    for (let i = 0; i < N; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      arr[i] = (s / 0xffffffff - 0.5) * 1e9;
    }
    arr[0] = -Infinity;
    arr[1] = Infinity;
    arr[2] = 0;
    arr[3] = -0;
    const native = new Float32Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  }, 120_000);

  test("returns a new array, doesn't mutate input", async () => {
    const parallel = (await import("para:parallel")).default;
    const arr = new Int32Array([3, 1, 2, 5, 4]);
    const before = new Int32Array(arr);
    const ps = await parallel.psort(arr as any);
    expect(ps).not.toBe(arr);
    expect(arr).toEqual(before);
    await parallel.disposeWorkers();
  });

  test("Float64Array sorts correctly across negatives + ±Infinity + ±0 + subnormals", async () => {
    const parallel = (await import("para:parallel")).default;
    const arr = new Float64Array([
      -Infinity,
      Infinity,
      0,
      -0,
      1.5,
      -1.5,
      Math.PI,
      -Math.PI,
      Number.MIN_VALUE,
      -Number.MIN_VALUE,
      Number.MAX_VALUE,
      -Number.MAX_VALUE,
      1e-300,
      -1e-300,
      1e300,
      -1e300,
    ]);
    const native = new Float64Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("Float64Array large random matches native", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 8_000;
    const arr = new Float64Array(N);
    let s = 0xdeadbeef;
    for (let i = 0; i < N; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      arr[i] = (s / 0xffffffff - 0.5) * 1e150;
    }
    const native = new Float64Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("BigInt64Array sorts correctly across the negative→positive boundary", async () => {
    const parallel = (await import("para:parallel")).default;
    const arr = new BigInt64Array([
      -9223372036854775808n,
      9223372036854775807n,
      0n,
      -1n,
      1n,
      -2147483648n,
      2147483647n,
      -4294967296n,
      4294967296n,
      -9223372036854775807n,
    ]);
    const native = new BigInt64Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("BigInt64Array large random matches native", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 6_000;
    const arr = new BigInt64Array(N);
    let s = 0xdeadbeef;
    for (let i = 0; i < N; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      const hi = BigInt(s);
      s = (s * 1103515245 + 12345) >>> 0;
      const lo = BigInt(s);
      // Pack hi:lo and reinterpret as signed.
      const u = (hi << 32n) | lo;
      arr[i] = BigInt.asIntN(64, u);
    }
    const native = new BigInt64Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("BigUint64Array sorts correctly", async () => {
    const parallel = (await import("para:parallel")).default;
    const arr = new BigUint64Array([
      0n,
      18446744073709551615n,
      1n,
      4294967295n,
      4294967296n,
      9223372036854775808n,
      9223372036854775807n,
    ]);
    const native = new BigUint64Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });

  test("BigUint64Array large random matches native", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 6_000;
    const arr = new BigUint64Array(N);
    let s = 0xdeadbeef;
    for (let i = 0; i < N; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      const hi = BigInt(s);
      s = (s * 1103515245 + 12345) >>> 0;
      const lo = BigInt(s);
      arr[i] = (hi << 32n) | lo;
    }
    const native = new BigUint64Array(arr).sort();
    const ps = await parallel.psort(arr as any);
    expect(ps).toEqual(native);
    await parallel.disposeWorkers();
  });
});

describe("para:parallel.psort — fallback decisions", () => {
  test("serial: true forces native main-thread sort", async () => {
    const parallel = (await import("para:parallel")).default;
    const N = 50_000;
    const arr = Array.from({ length: N }, (_, i) => ({ id: i, k: N - i }));
    const ps = await parallel.psort(arr, (a, b) => a.k - b.k, { serial: true });
    // Result must still be correct; the fact that we serialed is an
    // implementation choice not visible at the API.
    for (let i = 0; i < N; i++) expect(ps[i].id).toBe(N - 1 - i);
    await parallel.disposeWorkers();
  });

  test("typed-array input + comparator throws (radix path is value-only)", async () => {
    const parallel = (await import("para:parallel")).default;
    const arr = new Float32Array([3, 1, 2]);
    // @ts-expect-error — comparator on typed array isn't supported by the radix path
    await expect(parallel.psort(arr, (a, b) => a - b)).rejects.toThrow(/comparator/);
    await parallel.disposeWorkers();
  });

  test("non-array input throws TypeError", async () => {
    const parallel = (await import("para:parallel")).default;
    // @ts-expect-error — invalid input on purpose
    await expect(parallel.psort("hello")).rejects.toThrow(TypeError);
    // @ts-expect-error
    await expect(parallel.psort(42)).rejects.toThrow(TypeError);
    // @ts-expect-error
    await expect(parallel.psort(null)).rejects.toThrow(TypeError);
    await parallel.disposeWorkers();
  });
});
