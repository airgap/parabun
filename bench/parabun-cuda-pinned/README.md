# parabun-cuda-pinned

Measures the PCIe transfer win from allocating CUDA host buffers with
`cuMemAllocHost_v2` (page-locked, DMA-direct) vs the plain `new Float32Array`
path (pageable, driver stages through a private pinned ring).

Run:

```sh
bun run build:release --asan=off
./build/release/bun bench/parabun-cuda-pinned/run.pjs
```

Requires a CUDA-capable NVIDIA GPU + ASAN disabled (`cuInit` returns
`CUDA_ERROR_OUT_OF_MEMORY` under ASAN-instrumented bun).

## Results — RTX 4070 Ti, PCIe 4.0 x16, driver 570.211.01

```
shape              | total MB |   pageable |     pinned | speedup
---------------------------------------------------------------------
512×512·512×512    |      3.0 |     0.54ms |     0.42ms |   1.27×
1024×1024·1024×1024|     12.0 |     1.61ms |     1.48ms |   1.09×
2048×1024·1024×2048|     32.0 |     4.07ms |     3.81ms |   1.07×
2048×2048·2048×2048|     48.0 |     6.29ms |     6.01ms |   1.05×

simdMap (PCIe-bound)
N            |     MB |   pageable |     pinned | speedup
-----------------------------------------------------------
262144       |    1.0 |     0.58ms |     0.54ms |   1.07×
1048576      |    4.0 |     1.84ms |     1.80ms |   1.02×
4194304      |   16.0 |     6.91ms |     6.74ms |   1.03×
16777216     |   64.0 |    27.36ms |    27.01ms |   1.01×
```

## Reality-check on the estimated win

The LYK-710 ticket estimated 2–3× on PCIe-bound transfers; measured wins
are 1.01–1.27×. A few reasons the theoretical ceiling isn't achievable
here:

1. **Modern CUDA drivers already stage pageable transfers efficiently.**
   The driver maintains a pinned ring buffer internally, so the "extra
   memcpy" is a well-amortized DDR4→pinned copy (~30-40 GB/s), not a
   full round-trip.

2. **Synchronous `cuMemcpyHtoD_v2` blocks on the transfer anyway.** The
   real async win — transfer/compute overlap — requires `*Async` +
   streams, which is a separate lift (future ticket).

3. **PCIe 4.0 x16 ≈ 25-27 GB/s effective.** At 64 MB the theoretical
   transfer floor is ~2.4 ms; we see 27 ms, so something else (kernel
   launch, synchronize, or FFI hops) dominates, not the HtoD itself.

**Net:** pinning is a correct, consistent 2-10% win on synchronous-transfer
workloads, not the headline 2-3× the ticket expected. For callers whose
bottleneck is transfer, the API (`gpu.alloc(n, "f32", { pinned: true })` +
`gpu.releasePinned`) is the right shape to build on when we layer async
streams on top later.
