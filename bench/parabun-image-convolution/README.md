# parabun-image-convolution

Separable 5-tap Gaussian blur on an 8192 × 8192 grayscale image (64 MB
`Uint8Array`), single-threaded vs tiled across 8 workers with SAB-backed
intermediate and output buffers.

This proves that Parabun's `para:parallel` + `SharedArrayBuffer` pattern
extends cleanly to `Uint8` pixel data — not just `Float32Array`
embeddings. Different domain, same primitives.

## Workload

- 8192 × 8192 grayscale image, one byte per pixel (64 MB).
- 5-tap Gaussian kernel (σ ≈ 1.0), separable: horizontal pass then
  vertical pass.
- Boundary handling: edge replication.
- Output: blurred image, compared across variants by FNV-1a hash of the
  full pixel buffer (bit-identical means same algorithm).

## Results (best-of-3, release build)

| variant                       | score_ms (min/med/max)     | hash     |
|-------------------------------|---------------------------:|---------:|
| baseline (single-threaded)    | 375.36 / 386.47 / 421.71   | 745b3755 |
| **parabun (pmap × 8 + SAB)**  |  79.74 /  81.30 /  81.41   | 745b3755 |

Parabun is **4.75× faster**, output is byte-identical to baseline.

## Why the pattern ports cleanly

The convolution kernel doesn't vectorize well (per-pixel work is a
5-element dot product — SIMD setup overhead dominates at that size),
so this bench is another pure `pmap` win. The interesting part is how
SAB slots in:

1. **Input, intermediate, and output all live in SABs.** `postMessage`
   of a `Uint8Array` view over a SAB ships only a handle — no 64 MB
   memcpy per call, unlike structured clone of a plain `ArrayBuffer`.
2. **Two `await pmap(...)` calls form an implicit barrier** between
   horizontal and vertical passes. No explicit atomics or locks needed:
   `await` guarantees every worker has flushed its horizontal slab to
   intermediate before the vertical pass starts reading.
3. **Each worker gets a row range, not a tile.** Row-major layout means
   per-slab sequential reads and writes — cache-friendly even at
   64 MB where the image no longer fits in L2.

At smaller resolutions (2048² / 4 MB) the speedup is only ~1.6× because
worker setup and task dispatch dominate at ~30 ms total work. At 4096²
it's ~3×, and at 8192² (this bench) it's ~4.75× — the work is finally
big enough to amortize pmap's per-call overhead.

## Running it

```sh
bun run build:release bench/parabun-image-convolution/run.ts
```

## Files

- `gen.js` — deterministic 8192² grayscale generator with a sharp
  horizontal and vertical band so blur has visible work to do. Exports
  the 5-tap Gaussian kernel and an FNV-1a hasher for output comparison.
- `baseline.js` — single-threaded separable blur with inlined kernel
  taps and clamped boundary reads.
- `variant-parabun.pjs` — same algorithm tiled across 8 workers, two
  sequential `pmap` calls (horizontal → vertical). Input/intermediate/
  output all SAB-backed.
- `run.ts` — best-of-3 harness, verifies output hash matches across
  variants.
