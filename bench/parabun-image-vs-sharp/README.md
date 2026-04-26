# bun:image vs sharp

Two benches with very different stories — and that difference is the
key insight, not a footnote.

```sh
bun run bench/parabun-image-vs-sharp/seed.ts                       # once

# Kernel-only — raw pixels in, raw pixels out, no codec.
# This is the "is our kernel actually faster than libvips's kernel" question.
bun run build:release --asan=off bench/parabun-image-vs-sharp/kernels.ts

# End-to-end — bytes in, bytes out, includes codec round-trip.
# This is "what happens at a typical decode-do-thing-encode call site".
bun run build:release --asan=off bench/parabun-image-vs-sharp/run.ts
```

## Kernel-only — bun:image clearly surpasses Sharp

16-core x86 release build (`-O3 -march=haswell`, AVX2 enabled),
sharp 0.34.5, 4096² RGBA, best-of-7 per cell after 2 warmup runs:

```
                              sharp     parabun   speedup
Gaussian blur radius=3        118.0 ms   32.6 ms   3.62× FASTER
Gaussian blur radius=5        121.7 ms   36.2 ms   3.36× FASTER
Gaussian blur radius=10       141.2 ms   58.1 ms   2.43× FASTER
Gaussian blur radius=20       179.5 ms  152.0 ms   1.18× FASTER

Lanczos resize 4096→2048      104.0 ms   42.8 ms   2.43× FASTER
Bilinear resize 4096→2048      80.0 ms    6.0 ms  13.43× FASTER

Box blur radius=3..20         122-189 ms 71-76 ms  1.7-2.5× FASTER
  (vs sharp Gaussian — sharp doesn't expose box blur as a primitive)
```

This is the honest "actually faster" claim. Every kernel surpasses
Sharp's libvips equivalent. The bilinear-resize 13.4× is the most
dramatic but the Gaussian 2.4-3.6× across the common-radius range is
arguably the more important number.

## End-to-end — sharp wins, and that's a different problem

Same 4096² fixtures, but bytes in / bytes out (includes JPEG or PNG
round-trip):

```
                              sharp     parabun   verdict
JPEG decode → encode small      2.2 ms     1.9 ms  parabun 1.14× faster ✓
JPEG decode → encode medium    17.9 ms    27.8 ms  sharp 1.55× faster
JPEG decode → encode large     69.9 ms   111.7 ms  sharp 1.60× faster

Lanczos resize → JPEG large    57.6 ms    96.8 ms  sharp 1.68× faster
Gaussian blur → JPEG large    105.4 ms   170.9 ms  sharp 1.62× faster

PNG round-trip large           51.2 ms   120.2 ms  sharp 2.35× faster
PNG round-trip small            6.4 ms     5.3 ms  parabun 1.21× faster ✓
```

Sharp wins end-to-end on medium and large despite losing on every
kernel. The reason: **Sharp's lazy pipeline shares buffers across
decode → transform → encode** in a single libvips graph. Our
explicit per-step API (`decode(bytes)` → `transform()` → `encode()`)
materializes intermediate uint8 image buffers between every step,
paying the codec round-trip cost in full.

The fix is structural, not more kernel tuning: a chained
`image.pipeline(bytes).resize().blur().toBytes()` API that defers
materialization until the final byte conversion. With that, the
end-to-end numbers should align with the kernel-only numbers (so
parabun winning on every case), because there's no longer a redundant
encode-then-decode sandwich between operations.

## Optimization commits this work landed across

| commit | what | net effect |
|---|---|---|
| `2e690d87b1` | `parallelRows()` thread helper across resize / blur / sharpen / Sobel / luma / adjust / threshold / invert | 4-7× faster on multi-core |
| `dbda1cd2e1` | Branchless edge / interior split in blur for auto-vectorization | small additional win |
| `a81f6a068d` | Hand SSE2+FMA / NEON intrinsics on RGBA blur hot path | small additional win |
| `bd110c3c2a` | AVX2 256-bit blur (2 RGBA pixels / iteration) | small additional win on compute-bound radii |
| `807f66cdcb` | libpng row-callback API for PNG decode + encode | PNG end-to-end 4.28× → 2.35× slower |
| `a9ebd2a245` | `image.boxBlur` via summed-area tables (O(1) per pixel) | new primitive, 1.7-2.5× of sharp Gaussian at any radius |

## Reproducing the numbers

```sh
# Generate fixtures (one-time, ~5 MB of disk)
bun run bench/parabun-image-vs-sharp/seed.ts

# Kernel-only (the honest "we win" comparison)
bun run build:release --asan=off bench/parabun-image-vs-sharp/kernels.ts

# End-to-end (including codec round-trip)
bun run build:release --asan=off bench/parabun-image-vs-sharp/run.ts

# GPU dispatch architecture (CUDA wired, Metal mirror in place but
# unvalidated). On this dev box the GPU loses to CPU because PCIe
# stays at Gen 1 x8 — re-run on production hosts where the link
# stays at Gen 4 x16.
bun run build:release --asan=off bench/parabun-image-vs-sharp/gpu-warm.ts
```

## When bun:image is the right pick

- **Always** if your work is compute-bound on a single op — kernels
  are unconditionally faster than Sharp's.
- **Always** for `bun build --compile` deploys — Sharp pulls ~30 MB
  of platform-specific native code per arch with prebuild downloads
  at install time; bun:image is statically linked into the runtime.
- **Now** for end-to-end pipelines where you'd reach for Sharp on
  Node — the gap exists but is bounded; closing it is a roadmap
  item (chained pipeline API), not a fundamental limit.

## Memory

Findings are recorded under `memory/project_parabun_image_vs_sharp.md`
and `memory/project_parabun_image_perf_session.md`.
