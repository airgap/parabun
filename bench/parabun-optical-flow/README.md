# parabun-optical-flow

Lucas-Kanade dense optical flow between two 2048 × 2048 grayscale frames
(4 MB per frame, 8 MB total input, 48 MB of Float32 intermediates),
single-threaded vs tiled across 8 workers with both frames and all
intermediates SAB-backed.

This is the first Parabun CV bench that's **temporal** — the
interesting content is the relationship between two frames, not a
single-image operation. The two frames live together in shared memory
and workers read both interleaved, which is exactly the pattern real
video pipelines need (streaming decoder → SAB ringbuffer → worker pool
consumes consecutive frames).

## Workload

- Two 2048 × 2048 grayscale frames (4 MP each). Frame B is frame A
  bilinearly shifted by a known subpixel amount `(SHIFT_X, SHIFT_Y) =
  (0.4, -0.3)`, so recovered flow at every well-conditioned pixel
  should approximate those values.
- 5×5 Lucas-Kanade window.
- Two passes:
  1. **Gradient pass.** Compute `Ix`, `Iy` (central differences on
     frame B) and `It = B - A`, written as three `Float32Array`
     planes.
  2. **Solve pass.** Per output pixel, accumulate the 5×5 window of
     `(Ix², Ix·Iy, Iy², Ix·It, Iy·It)`, form the 2×2 normal-equations
     system, solve for `(u, v)`, write to `flowU`/`flowV`
     `Float32Array` planes.
- Output compared across variants by FNV-1a hash of the concatenated
  flow-field bytes (bit-identical means same algorithm).

Ground-truth sanity check: the mean of the recovered flow over
non-degenerate pixels should match the shift within ~10-15% — the
residual is quantization bias from 8-bit pixels and the window-
smoothing penalty inherent to single-scale LK, identical across
variants.

## Results (best-of-3, release build)

| variant                       | score_ms (min/med/max)    | hash              | flow_mean (u, v)   |
|-------------------------------|--------------------------:|-------------------|-------------------:|
| baseline (single-threaded)    | 170.86 / 171.86 / 176.92  | bfc3ade006e7ebf8  | (0.444, -0.316)    |
| **parabun (pmap × 8 + SAB)**  |  64.95 /  65.36 /  75.14  | bfc3ade006e7ebf8  | (0.444, -0.316)    |

Parabun is **2.63× faster**. Flow field is bit-identical; recovered
mean flow matches ground truth `(0.4, -0.3)` within ~11% and ~5%
respectively.

## Why the temporal pattern works

1. **Two input frames, one SAB each, zero-copy shipping.** Each frame
   is 4 MB; structured-cloning two frames into every chunk for 8
   chunks would be ~64 MB of serialization per call. With SAB, every
   worker reads the same physical memory through its `Uint8Array`
   view. This is what lets the pattern extend cleanly to streaming
   video — SAB ringbuffer + `postMessage` of a view is how you shovel
   60 fps of 1080p frames into a worker pool without copying.
2. **Three gradient planes + two output planes live in SAB too.**
   `Ix`, `Iy`, `It` are `Float32Array`-over-SAB (16 MB each). Pass 1
   writes them, pass 2 reads them. `flowU`, `flowV` are the final
   outputs, also SAB-backed, so a consumer thread (e.g. a visualizer
   or downstream tracker) can read without another clone.
3. **`await` between passes is the implicit barrier.** Pass 1 writes
   gradients; pass 2 reads them (including a 2-row halo above/below
   the worker's own slab). `await pmap(gradSlab, …)` guarantees every
   worker has flushed before any pass-2 read fires. No atomics, no
   locks, no explicit halo exchange — the row-major SAB layout plus
   `await` is enough synchronization.
4. **The per-pixel kernel is heavy enough to amortize dispatch.** At
   5×5 window, each output pixel does ~125 mults + ~100 adds + one 2×2
   solve. That's ~200-300× the work of a Gaussian blur pixel. Even
   though the image is 16× smaller (2048² vs 8192²), total compute is
   in the same ballpark, and pmap's per-call overhead disappears
   against ~170 ms of baseline work.

## Known algorithmic limitations

- Single-scale LK (no pyramidal refinement). Recovered flow biases
  toward zero for shifts exceeding ~1 pixel; this is why the bench uses
  a subpixel ground truth.
- 8-bit quantization of frame B's bilinear sampling leaves a small
  residual bias (~5-15% of shift magnitude). This is **identical across
  variants** — the hash match proves both implementations agree to the
  last bit — so it's a property of the bench's chosen math, not of
  Parabun's execution.

Neither limitation affects the speedup story: we measure wall-clock
time for the same computation both variants run.

## Running it

```sh
bun run build:release bench/parabun-optical-flow/run.ts
```

## Files

- `gen.js` — deterministic two-frame generator. Builds a smooth scene
  (sum-of-sines plus small noise, low-frequency enough that LK's Taylor
  linearization is valid), then samples both frames through identical
  bilinear kernels at symmetric half-shifts so neither frame has more
  gradient-smoothing than the other. Exports `SHIFT_X`, `SHIFT_Y`,
  `WIN`, `DET_EPS`, and the FNV-1a hasher.
- `baseline.js` — single-threaded: gradient pass then solve pass,
  scalar loops.
- `variant-parabun.pjs` — same two-pass algorithm tiled across 8
  workers via `@para/parallel.pmap`. Frames, gradient planes, and flow
  outputs all SAB-backed.
- `run.ts` — best-of-3 harness, verifies flow-field hash matches and
  prints recovered mean against the ground-truth shift.
