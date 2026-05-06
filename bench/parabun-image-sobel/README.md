# parabun-image-sobel

Sobel edge detection on an 8192 × 8192 grayscale image (64 MB
`Uint8Array`), single-threaded vs tiled across 8 workers with SAB-backed
input and output buffers.

Where `parabun-image-convolution` proves the `pmap + SAB` pattern on
lightweight per-pixel work (5-tap separable Gaussian: 10 mults + 8 adds
per pixel across two passes), this bench extends it to heavier work:
two 3×3 convolutions computed together, a `sqrt` magnitude, and a
clamp-to-255 — a classical CV kernel and the foundation of every edge-
based feature detector (Canny, Harris, HOG).

## Workload

- 8192 × 8192 grayscale image, one byte per pixel (64 MB).
- Sobel kernels:
  - `Gx = [[-1, 0, +1], [-2, 0, +2], [-1, 0, +1]]`
  - `Gy = [[-1, -2, -1], [ 0,  0,  0], [+1, +2, +1]]`
- Per pixel: 12 multiplications + 10 additions + 1 `sqrt` + 1 clamp,
  then write one byte of gradient magnitude.
- Boundary handling: edge replication.
- Output compared across variants by FNV-1a hash of the full pixel
  buffer (bit-identical means same algorithm).

## Results (best-of-3, release build)

| variant                       | score_ms (min/med/max)     | hash     |
|-------------------------------|---------------------------:|---------:|
| baseline (single-threaded)    | 536.01 / 550.86 / 553.45   | ff9b8bd0 |
| **parabun (pmap × 8 + SAB)**  |  91.39 /  92.70 /  94.85   | ff9b8bd0 |

Parabun is **5.94× faster**, output is byte-identical to baseline.

## Why the speedup is bigger than Gaussian's

`parabun-image-convolution` (5-tap separable Gaussian) hits 4.75× on the
same image size with the same 8 workers. Sobel pulls 5.94× because the
per-pixel arithmetic is heavier — 12 mults + 10 adds + 1 sqrt — so the
compute-to-dispatch ratio is better. The `Math.sqrt` in particular is
a scalar op that stays on the CPU side of the JIT (no vector
opportunity), so it benefits purely from having 8 cores instead of one.

Three pattern notes specific to this bench:

1. **Single-pass kernel, single-pass `pmap`.** Unlike separable Gaussian
   (horizontal pass → vertical pass, two `await pmap(...)` calls with an
   implicit barrier in between), Sobel computes `Gx` and `Gy` together
   per pixel. There's one output buffer, one pass, one `pmap`. No
   intermediate.
2. **Read halo overlaps cleanly via SAB.** Each worker processes rows
   `[yStart, yEnd)` but reads one row above and below. Because the
   input image lives in a `SharedArrayBuffer`, those halo reads just
   land on the same physical memory as the owning worker's writes —
   no explicit halo-exchange protocol.
3. **`Math.sqrt` is fine in a `pure function`.** The purity validator
   allows `Math.*` globals; the kernel body stays a closed-form tight
   loop that the worker-side JIT can compile straightforwardly.

## Running it

```sh
bun run build:release bench/parabun-image-sobel/run.ts
```

## Files

- `gen.js` — deterministic 8192² grayscale generator with sharp horizontal
  and vertical bands so Sobel has strong edges to detect. Exports the
  FNV-1a hasher used for output comparison.
- `baseline.js` — single-threaded Sobel with inlined Gx/Gy taps, clamped
  boundary reads, `sqrt` magnitude, clamp-to-255 write.
- `variant-parabun.pjs` — same algorithm tiled across 8 workers via
  `@para/parallel.pmap`. Input and output both SAB-backed; one pmap pass.
- `run.ts` — best-of-3 harness, verifies output hash matches across
  variants.
