# Metal matVec input-staging microbench

Standalone bun:ffi harness (stock Bun, no parabun extensions) that measures
four candidate `parabun:gpu.matVec` paths against an auto-vectorized CPU tight
loop on Apple Silicon:

- **(A) COPY** — `newBufferWithBytes:length:options:` (today's metal.ts)
- **(B) NOCOPY** — `newBufferWithBytesNoCopy:length:options:deallocator:`
  with page-aligned input (requires `posix_memalign`ed matrix)
- **(B')** NOCOPY against a page-aligned scratch buffer, memcpy'ing the
  user's non-aligned matrix in each call (isolates "win from skipping
  memcpy" vs "win from avoiding MTLBuffer's internal staging")
- **(C) RESIDENT** — MTLBuffer created once, reused across dispatches
  (Tier 4 lower bound)
- **(D) CPU** — tight-loop `sum += mat[i*K+j] * vec[j]` (JSC auto-vectorizes)

## Run

    scp run.mjs <mac>:~/ && ssh <mac> 'bun ~/run.mjs'

Requires: Apple Silicon macOS, stock Bun 1.3+. No parabun.

## Apple M4, macOS 15.6, bun 1.3.7 (2026-04-14)

| Size   | bytes | COPY    | NOCOPY  | RESIDENT | CPU     |
|--------|-------|--------:|--------:|---------:|--------:|
| 512²   | 1 MiB | 0.52 ms | 0.42 ms | 0.39 ms  | **0.22 ms** |
| 1024²  | 4 MiB | 0.54 ms | 0.32 ms | 0.26 ms  | 0.63 ms |
| 2048²  | 16 MiB| 1.48 ms | 0.66 ms | 0.41 ms  | 2.54 ms |
| 4096²  | 64 MiB| 10.4 ms | 2.35 ms | **0.94 ms** | 10.2 ms |

(Medians of 100 iters, 10 warmup.)

## Conclusions

1. **Today's COPY path never meaningfully beats CPU.** At 64 MiB it's a
   wash because memcpy dominates. Current `MIN_MATVEC_WINS_ELEMS =
   Infinity` is correct for COPY.
2. **NOCOPY flips the result decisively** — 2–4× faster than CPU across
   all sizes ≥ 4 MiB. Shipping NOCOPY would let `MIN_MATVEC_WINS_ELEMS`
   move to ~1<<20 (1 M f32 elems, 4 MiB).
3. **Residency (Tier 4) adds 30–150% on top of NOCOPY** and the relative
   gain grows with size. At 64 MiB RESIDENT is 2.5× faster than NOCOPY.
4. **Crossover is ~768²** — below that CPU wins regardless of staging.

**(B') is decisive for the API design**: memcpying a non-aligned user
matrix into a page-aligned scratch and using NOCOPY is only ~30% faster
than plain COPY, and at 16+ MiB it still loses to CPU. The win comes
from the user's matrix *already being* page-aligned — i.e., allocated
via a `parabun:gpu.allocMatrix(...)`-style API that returns page-aligned
typed arrays. Opportunistic alignment detection of arbitrary user
Float32Arrays would almost never fire.
