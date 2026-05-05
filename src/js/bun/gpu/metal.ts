// Parabun Metal backend for parabun:gpu.
//
// Loaded by src/js/bun/gpu.ts — exposes a `Backend`-conforming object that
// drives Apple Silicon (and Intel Mac) GPUs via Metal. We reach Metal
// through C entry points from:
//   - /System/Library/Frameworks/Metal.framework/Metal (MTLCreateSystemDefaultDevice)
//   - /usr/lib/libobjc.A.dylib (objc_getClass, sel_registerName, objc_msgSend)
//
// Every non-bootstrap Metal call (newCommandQueue,
// newLibraryWithSource:options:error:, …) is an Obj-C message send
// dispatched through objc_msgSend. arm64 uses a single objc_msgSend
// symbol for all message signatures — the ABI is dictated by the call
// site — so we dlopen libobjc once per distinct `(args, returns)` shape
// we need; each opens the same underlying function with a different
// bun:ffi wrapper.
//
// Scope today: simdMap-affine (y = k1*x + k0) on Float32Array — the one
// kernel proven end-to-end against the MSL compiler + a roundtrip. dot,
// matVec, matmul fall back to para:simd, matching the CUDA backend's
// Phase-1 shape.
//
// Memory: the MSL source is compiled in probe(). The resulting library,
// function, pipeline, and queue are held for the backend's lifetime.
// Per-dispatch MTLBuffers are allocated + released inside launchAffineF32
// with try/finally. dispose() releases all retained Obj-C objects.

const simd = require("../simd.ts");

type FArray = Float32Array | Float64Array;

// Opaque handle returned by `hold(arr)`. Carries a resident MTLBuffer so
// that subsequent matVec calls skip both the memcpy and the MTLBuffer
// allocation. The brand property lets gpu.ts pass handles through
// `FArray | GpuHandle` union sites and detect them cheaply.
type GpuHandle = {
  __bunGpuHandle: true;
  backend: "metal" | "cuda" | "cpu";
  type: "f32" | "f64";
  length: number;
  buffer: bigint; // MTLBuffer id (0n once released or on non-Metal hosts)
  view: FArray; // Original typed array — kept alive so the NOCOPY pointer stays valid
  released: boolean;
  // Populated by holdQ4K / holdQ6K. When set, `buffer` holds the raw
  // packed super-block bytes (144 B/block for q4_K, 210 B/block for
  // q6_K) and matVec dispatches to the Q-aware kernel instead of the
  // f32 one. `view` is a stub Float32Array(0) on these handles —
  // callers must not read it.
  qFormat?: "q4_K" | "q6_K";
};

function isGpuHandle(x: unknown): x is GpuHandle {
  return typeof x === "object" && x !== null && (x as any).__bunGpuHandle === true;
}

// Unwrap a handle or pass-through a typed array. Throws on released
// handles so use-after-release is a consistent error across every op,
// not just matVec.
function unwrapHandle<T extends FArray>(x: T | GpuHandle): T {
  if (isGpuHandle(x)) {
    if (x.released) throw new Error("parabun:gpu: op called on released handle");
    return x.view as T;
  }
  return x;
}

const LIBOBJC = "/usr/lib/libobjc.A.dylib";
const METAL_FRAMEWORK = "/System/Library/Frameworks/Metal.framework/Metal";

// ─── MSL kernel ───────────────────────────────────────────────────────────
// Mirrors the PTX kernel in ./cuda.ts — one thread per element, guarded
// by a bounds check. fma matches the numeric behavior of CUDA's fma.rn.f32
// within rounding (Metal's default fp math is precise on Apple GPUs).

const MSL_SOURCE = `
#include <metal_stdlib>
using namespace metal;

kernel void simdMapAffineF32(
    device const float *inPtr     [[buffer(0)]],
    device       float *outPtr    [[buffer(1)]],
    constant     uint  &n         [[buffer(2)]],
    constant     float &k1        [[buffer(3)]],
    constant     float &k0        [[buffer(4)]],
    uint                gid       [[thread_position_in_grid]])
{
    if (gid >= n) return;
    outPtr[gid] = fma(k1, inPtr[gid], k0);
}

// Row-major M x K matrix times a K-vector -> M-vector.
//
// Each threadgroup is exactly one simdgroup (32 threads on Apple Silicon)
// handling exactly one output row. The 32 lanes split the K-column dot
// product stride-wise — lane t reads r[t], r[t+32], r[t+64], ... — then
// simd_sum tree-reduces the 32 partial sums into one value that lane 0
// writes to outPtr[row].
//
// Why this beats the naive one-thread-per-row version: coalescing. With
// 32 threads of one simdgroup reading mat[row*K + {j, j+1, ..., j+31}] in
// lockstep, the GPU issues one 128-byte load per iteration instead of 32
// stride-K loads. Same for vec[]. The FMA count per row is unchanged (K)
// but effective memory bandwidth doubles-to-triples on M-series.
//
// The tree reduction in simd_sum produces a different rounding order
// from para:simd's left-to-right accumulator, so outputs may differ from
// simd.matVec by up to a few ULP — the cross-check tolerates this.
kernel void matVecF32(
    device const float *mat       [[buffer(0)]],
    device const float *vec       [[buffer(1)]],
    device       float *outPtr    [[buffer(2)]],
    constant     uint  &m         [[buffer(3)]],
    constant     uint  &k         [[buffer(4)]],
    uint                row       [[threadgroup_position_in_grid]],
    uint                lane      [[thread_position_in_threadgroup]])
{
    if (row >= m) return;
    device const float *r = mat + (ulong)row * k;
    float acc = 0.0f;
    for (uint j = lane; j < k; j += 32) acc = fma(r[j], vec[j], acc);
    acc = simd_sum(acc);
    if (lane == 0) outPtr[row] = acc;
}

// Row-major matmul: C[m, n] = A[m, k] @ B[k, n].
//
// 32x32 output tile per threadgroup, one thread per output cell (1024
// threads = the Apple GPU max-per-threadgroup limit). We walk K in 32-wide
// strips, co-loading the A-tile and B-tile into threadgroup memory, then
// each thread does 32 FMAs into its private accumulator.
//
// Shape vs the CUDA PTX kernel: CUDA uses 64 threads with a 4x4 register
// tile per thread for the same 32x32 output tile; Metal's simdgroup width
// is 32 and register files are larger per-thread, but 1024 threads/TG is
// the hard cap, so we use one-thread-per-cell here. Same output shape,
// different work-per-thread. For the shapes parabun:gpu targets (Q @ E^T in
// retrieval workloads: M=Q≈64, K=D=384, N=100k) the bottleneck is the
// 9.6 GB SMEM + register fill, not the FMA rate — the simpler kernel
// should hit the same memory ceiling.
kernel void matmulF32(
    device const float *A         [[buffer(0)]],
    device const float *B         [[buffer(1)]],
    device       float *C         [[buffer(2)]],
    constant     uint  &M         [[buffer(3)]],
    constant     uint  &K         [[buffer(4)]],
    constant     uint  &N         [[buffer(5)]],
    uint2               gid       [[threadgroup_position_in_grid]],
    uint2               lid       [[thread_position_in_threadgroup]])
{
    constexpr uint TS = 32u;
    threadgroup float As[TS][TS];
    threadgroup float Bs[TS][TS];

    uint row = gid.y * TS + lid.y;
    uint col = gid.x * TS + lid.x;

    float acc = 0.0f;
    for (uint t = 0; t < K; t += TS) {
        uint aCol = t + lid.x;
        uint bRow = t + lid.y;
        As[lid.y][lid.x] = (row < M && aCol < K) ? A[(ulong)row * K + aCol] : 0.0f;
        Bs[lid.y][lid.x] = (bRow < K && col < N) ? B[(ulong)bRow * N + col] : 0.0f;
        threadgroup_barrier(mem_flags::mem_threadgroup);
        for (uint s = 0; s < TS; s++) acc = fma(As[lid.y][s], Bs[s][lid.x], acc);
        threadgroup_barrier(mem_flags::mem_threadgroup);
    }

    if (row < M && col < N) C[(ulong)row * N + col] = acc;
}

// ── 2D convolution (valid mode) ────────────────────────────────────────────
// Output[y, x] = sum_{ky, kx} input[y+ky, x+kx] * kernel[ky, kx].
// Output dims: (iH-kH+1) × (iW-kW+1). One thread per output pixel; 16×16
// threadgroups give good cache locality on Apple Silicon. fma() promotes
// the inner accumulator into the GPU's FMA unit. No shared-memory tile
// for v1 — direct global loads. Worth optimizing later for large kernels
// (>= 7×7) where input reuse pays for the staging cost.
kernel void conv2d_f32(
    device const float *input  [[buffer(0)]],
    device const float *krn    [[buffer(1)]],
    device       float *outbuf [[buffer(2)]],
    constant     uint  &iW     [[buffer(3)]],
    constant     uint  &iH     [[buffer(4)]],
    constant     uint  &kW     [[buffer(5)]],
    constant     uint  &kH     [[buffer(6)]],
    uint2               gid    [[thread_position_in_grid]])
{
    uint x = gid.x;
    uint y = gid.y;
    uint oW = iW - kW + 1u;
    uint oH = iH - kH + 1u;
    if (x >= oW || y >= oH) return;
    float acc = 0.0f;
    for (uint ky = 0u; ky < kH; ky++) {
        uint inRow = (y + ky) * iW + x;
        uint kRow = ky * kW;
        for (uint kx = 0u; kx < kW; kx++) {
            acc = fma(input[inRow + kx], krn[kRow + kx], acc);
        }
    }
    outbuf[y * oW + x] = acc;
}

// ── Fused RGBA-uint8 Gaussian blur ────────────────────────────────────────
// Mirror of cuda.ts's gaussian_blur_rgba_u8. Used by parabun:image's
// image.blur(img, gpu: true) path so the entire op happens in
// one kernel invocation, sidestepping the JS-side per-channel
// deinterleave that would dominate a per-channel conv2D dispatch.
//
// One thread per output pixel; computes all 4 channels in parallel
// with float accumulators, packs back to uint8 with round + clamp.
// Edge clamp on border samples. Kernel weights are passed as a 1D
// Gaussian (the host builds it once); the kernel forms the 2D
// outer product on the fly.
//
// Tiled shared-mem variant follows once we have a Metal host that
// can validate it; for v1 this is the global-mem version (same shape
// as conv2D).
kernel void gaussian_blur_rgba_u8(
    device const uchar *src       [[buffer(0)]],
    device       uchar *dst       [[buffer(1)]],
    constant     uint  &w         [[buffer(2)]],
    constant     uint  &h         [[buffer(3)]],
    device const float *kern1d    [[buffer(4)]],
    constant     int   &radius    [[buffer(5)]],
    uint2               gid       [[thread_position_in_grid]])
{
    int x = (int)gid.x;
    int y = (int)gid.y;
    if (x >= (int)w || y >= (int)h) return;

    float r = 0.0f, g = 0.0f, b = 0.0f, a = 0.0f;
    int kSize = 2 * radius + 1;
    for (int ky = 0; ky < kSize; ky++) {
        int sy = y + ky - radius;
        if (sy < 0) sy = 0;
        if (sy >= (int)h) sy = (int)h - 1;
        float kyW = kern1d[ky];
        for (int kx = 0; kx < kSize; kx++) {
            int sx = x + kx - radius;
            if (sx < 0) sx = 0;
            if (sx >= (int)w) sx = (int)w - 1;
            float kw = kyW * kern1d[kx];
            int idx = (sy * (int)w + sx) * 4;
            r = fma((float)src[idx + 0], kw, r);
            g = fma((float)src[idx + 1], kw, g);
            b = fma((float)src[idx + 2], kw, b);
            a = fma((float)src[idx + 3], kw, a);
        }
    }

    int oIdx = (y * (int)w + x) * 4;
    int ri = (int)(r + 0.5f);
    int gi = (int)(g + 0.5f);
    int bi = (int)(b + 0.5f);
    int ai = (int)(a + 0.5f);
    if (ri < 0) ri = 0; else if (ri > 255) ri = 255;
    if (gi < 0) gi = 0; else if (gi > 255) gi = 255;
    if (bi < 0) bi = 0; else if (bi > 255) bi = 255;
    if (ai < 0) ai = 0; else if (ai > 255) ai = 255;
    dst[oIdx + 0] = (uchar)ri;
    dst[oIdx + 1] = (uchar)gi;
    dst[oIdx + 2] = (uchar)bi;
    dst[oIdx + 3] = (uchar)ai;
}

// ── Q4_K direct matVec ─────────────────────────────────────────────────────
// Port of the CUDA matvec_q4k_f32 kernel (src/js/bun/gpu/cuda.ts).
// Reads raw 144-byte super-blocks, dequantizes on chip, accumulates in f32.
// k must be a multiple of 256 (super-block size). Layout per row:
// (k/256) super-blocks × 144 bytes.
//
// Layout: 1 simdgroup (32 threads) per row; 4 simdgroups per threadgroup =
// 128 threads / TG = 4 rows / TG. Each lane handles 8 elements / sb (one
// per sub-block sb_idx 0..7, at column = lane). simd_sum reduces within
// a simdgroup; lane 0 of each simdgroup writes the output.
//
// Apple Silicon's simdgroup width is 32 (matches CUDA warps), so the
// shuffle/reduce pattern transfers directly.
kernel void matVecQ4KF32(
    device const uchar *mat       [[buffer(0)]],
    device const float *vec       [[buffer(1)]],
    device       float *outPtr    [[buffer(2)]],
    constant     uint  &m         [[buffer(3)]],
    constant     uint  &kSblocks  [[buffer(4)]],                  // k / 256
    uint                tid       [[thread_index_in_threadgroup]],
    uint                tgid      [[threadgroup_position_in_grid]])
{
    uint lane = tid & 31u;
    uint warpInBlock = tid >> 5;   // 0..3
    uint row = tgid * 4u + warpInBlock;
    if (row >= m) return;

    device const uchar *rowBase = mat + (ulong)row * (ulong)kSblocks * 144u;

    float acc = 0.0f;
    for (uint sb = 0; sb < kSblocks; sb++) {
        device const uchar *blk = rowBase + (ulong)sb * 144u;

        ushort dh  = (ushort)blk[0] | ((ushort)blk[1] << 8);
        ushort dmh = (ushort)blk[2] | ((ushort)blk[3] << 8);
        float d    = float(as_type<half>(dh));
        float dmin = float(as_type<half>(dmh));

        uint sc0_3 = (uint)blk[4] | ((uint)blk[5] << 8)
                   | ((uint)blk[6] << 16) | ((uint)blk[7] << 24);
        uint sc4_7 = (uint)blk[8] | ((uint)blk[9] << 8)
                   | ((uint)blk[10] << 16) | ((uint)blk[11] << 24);
        uint sc8_11 = (uint)blk[12] | ((uint)blk[13] << 8)
                    | ((uint)blk[14] << 16) | ((uint)blk[15] << 24);

        for (uint k_i = 0; k_i < 8u; k_i++) {
            uint sb_idx   = k_i;
            uint qi       = sb_idx * 32u + lane;                   // 0..255
            uint byte_idx = 32u * (sb_idx >> 1) + lane;            // into qs[128]
            uchar byte    = blk[16u + byte_idx];
            uint q = (sb_idx & 1u) ? ((uint)byte >> 4) : ((uint)byte & 0xFu);

            uint sc, mn;
            if (sb_idx < 4u) {
                uint s_sc = (sc0_3 >> (sb_idx * 8u)) & 0xFFu;
                uint s_mn = (sc4_7 >> (sb_idx * 8u)) & 0xFFu;
                sc = s_sc & 63u;
                mn = s_mn & 63u;
            } else {
                // llama.cpp get_scale_min_k4 unpacking
                uint s_jp4 = (sc8_11 >> ((sb_idx - 4u) * 8u)) & 0xFFu;
                uint s_jm4 = (sc0_3 >> ((sb_idx - 4u) * 8u)) & 0xFFu;
                uint s_j   = (sc4_7 >> ((sb_idx - 4u) * 8u)) & 0xFFu;
                sc = (s_jp4 & 0xFu) | (((s_jm4 >> 6) & 3u) << 4);
                mn = ((s_jp4 >> 4) & 0xFu) | (((s_j >> 6) & 3u) << 4);
            }

            float w = d * (float)sc * (float)q - dmin * (float)mn;
            float v = vec[sb * 256u + qi];
            acc = fma(w, v, acc);
        }
    }

    acc = simd_sum(acc);
    if (lane == 0) outPtr[row] = acc;
}

// ── Q6_K direct matVec ─────────────────────────────────────────────────────
// Port of matvec_q6k_f32. 210-byte super-blocks, 256 elements:
//   +0..+127    ql[128]   — 4 low bits of each 6-bit quant (packed)
//   +128..+191  qh[64]    — 2 high bits of each 6-bit quant (packed)
//   +192..+207  sc[16]    — int8 scales (signed)
//   +208..+209  fp16 d    — super-block scale
// Same 1-simdgroup-per-row, 4-per-TG layout as Q4_K.
kernel void matVecQ6KF32(
    device const uchar *mat       [[buffer(0)]],
    device const float *vec       [[buffer(1)]],
    device       float *outPtr    [[buffer(2)]],
    constant     uint  &m         [[buffer(3)]],
    constant     uint  &kSblocks  [[buffer(4)]],                  // k / 256
    uint                tid       [[thread_index_in_threadgroup]],
    uint                tgid      [[threadgroup_position_in_grid]])
{
    uint lane = tid & 31u;
    uint warpInBlock = tid >> 5;
    uint row = tgid * 4u + warpInBlock;
    if (row >= m) return;

    device const uchar *rowBase = mat + (ulong)row * (ulong)kSblocks * 210u;

    float acc = 0.0f;
    for (uint sb = 0; sb < kSblocks; sb++) {
        device const uchar *blk = rowBase + (ulong)sb * 210u;
        ushort dh = (ushort)blk[208] | ((ushort)blk[209] << 8);
        float d = float(as_type<half>(dh));

        for (uint k_i = 0; k_i < 8u; k_i++) {
            uint qi       = lane + k_i * 32u;
            uint g        = k_i >> 2;
            uint which    = k_i & 3u;
            uint ql_idx   = g * 64u + (which & 1u) * 32u + lane;  // 0..127
            uint qh_idx   = g * 32u + lane;                        // 0..63
            uint sc_idx   = g * 8u + which * 2u + (lane >> 4);     // 0..15

            uint qlv = blk[ql_idx];
            uint qhv = blk[128u + qh_idx];
            // int8 scale — reinterpret as signed.
            int scv = (int)(char)blk[192u + sc_idx];

            uint nibble = (which < 2u) ? (qlv & 0xFu) : (qlv >> 4);
            uint high2  = (qhv >> (which * 2u)) & 3u;
            int q_signed = (int)(nibble | (high2 << 4)) - 32;

            float w = d * (float)scv * (float)q_signed;
            float v = vec[sb * 256u + qi];
            acc = fma(w, v, acc);
        }
    }

    acc = simd_sum(acc);
    if (lane == 0) outPtr[row] = acc;
}

// ─── Device-resident kernel surface ("devOps") ──────────────────────────
// Ports of the CUDA devOps kernels in src/js/bun/gpu/cuda.ts, rewritten
// in MSL. Each is 1 thread per element (or per row) with no shared
// state — simple to verify, same shape as the CUDA originals.
//
// parabun:llm's forward pass requires the full devOps surface (~19 kernels);
// getDevOps() below returns null until every kernel in the list is
// present, so incremental session-by-session ports don't accidentally
// flip parabun:llm to a half-wired Metal path.

// Embedding table lookup: out[i] = embd[tokenId * dModel + i].
// Launch: ⌈dModel / 256⌉ TGs × 256 threads.
kernel void embed_lookup_f32(
    device const float *embd      [[buffer(0)]],
    device       float *x         [[buffer(1)]],
    constant     uint  &tokenId   [[buffer(2)]],
    constant     uint  &dModel    [[buffer(3)]],
    uint                gid       [[thread_position_in_grid]])
{
    if (gid >= dModel) return;
    x[gid] = embd[(ulong)tokenId * (ulong)dModel + gid];
}

// x[i] += d[i]. Launch: ⌈n / 256⌉ × 256.
kernel void accum_f32(
    device       float *x         [[buffer(0)]],
    device const float *d         [[buffer(1)]],
    constant     uint  &n         [[buffer(2)]],
    uint                gid       [[thread_position_in_grid]])
{
    if (gid >= n) return;
    x[gid] += d[gid];
}

// x[i] += b[i]. Same shape as accum_f32; kept as a distinct kernel so
// the parabun:llm dispatch surface lines up with CUDA's.
kernel void bias_add_f32(
    device       float *x         [[buffer(0)]],
    device const float *b         [[buffer(1)]],
    constant     uint  &n         [[buffer(2)]],
    uint                gid       [[thread_position_in_grid]])
{
    if (gid >= n) return;
    x[gid] += b[gid];
}

// Fused SwiGLU: gate[i] = gate[i] * sigmoid(gate[i]) * up[i].
// precise::exp on Apple GPUs maps to the hardware fast-path — close
// to CUDAs __expf. fp32 accumulator throughout.
kernel void silu_mul_f32(
    device       float *gate      [[buffer(0)]],
    device const float *up        [[buffer(1)]],
    constant     uint  &n         [[buffer(2)]],
    uint                gid       [[thread_position_in_grid]])
{
    if (gid >= n) return;
    float g = gate[gid];
    float sig = 1.0f / (1.0f + precise::exp(-g));
    gate[gid] = g * sig * up[gid];
}

// y[i] = a[i] + b[i]. Distinct from accum (in-place) so the dispatch
// surface matches CUDA's.
kernel void add_f32(
    device const float *a         [[buffer(0)]],
    device const float *b         [[buffer(1)]],
    device       float *y         [[buffer(2)]],
    constant     uint  &n         [[buffer(3)]],
    uint                gid       [[thread_position_in_grid]])
{
    if (gid >= n) return;
    y[gid] = a[gid] + b[gid];
}

// cache[pos * kvRowSize + i] = src[i]. One row write into a KV cache
// at position pos. Launch: ⌈kvRowSize / 256⌉ × 256.
kernel void kv_store_f32(
    device const float *src       [[buffer(0)]],
    device       float *cache     [[buffer(1)]],
    constant     uint  &pos       [[buffer(2)]],
    constant     uint  &kvRowSize [[buffer(3)]],
    uint                gid       [[thread_position_in_grid]])
{
    if (gid >= kvRowSize) return;
    cache[(ulong)pos * (ulong)kvRowSize + gid] = src[gid];
}

// RMSNorm: y[i] = x[i] * rsqrt(mean(x^2) + eps) * w[i].
// One threadgroup of bs threads handles the whole vector — strided
// partial-sum-of-squares, warp reduction via simd_sum, cross-warp
// reduction via shared memory, then second pass applies the scale.
// bs must be <= 1024 and a multiple of 32; warpSum is sized for the
// max case (32 warps = 1024 threads).
kernel void rmsnorm_f32(
    device const float *x         [[buffer(0)]],
    device const float *w         [[buffer(1)]],
    device       float *y         [[buffer(2)]],
    constant     uint  &n         [[buffer(3)]],
    constant     float &eps       [[buffer(4)]],
    uint                tid       [[thread_position_in_threadgroup]],
    uint                tpg       [[threads_per_threadgroup]])
{
    threadgroup float warpSum[32];
    threadgroup float sScale[1];

    uint lane = tid & 31u;
    uint warp = tid >> 5;

    float local = 0.0f;
    for (uint i = tid; i < n; i += tpg) {
        float v = x[i];
        local += v * v;
    }
    local = simd_sum(local);
    if (lane == 0u) warpSum[warp] = local;
    threadgroup_barrier(mem_flags::mem_threadgroup);

    if (warp == 0u) {
        uint nwarps = (tpg + 31u) >> 5;
        local = (tid < nwarps) ? warpSum[lane] : 0.0f;
        local = simd_sum(local);
        if (tid == 0u) sScale[0] = rsqrt(local / (float)n + eps);
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);

    float scale = sScale[0];
    for (uint i = tid; i < n; i += tpg) {
        y[i] = x[i] * scale * w[i];
    }
}

// argmax over f32 logits, ties broken by lower index. One threadgroup,
// bs threads (≤ 1024, multiple of 32). simd_shuffle_xor runs the
// paired (value, index) butterfly reduction inside each simdgroup,
// then a second pass reduces the per-warp partials.
kernel void argmax_f32(
    device const float *logits    [[buffer(0)]],
    device       int   *outIdx    [[buffer(1)]],
    constant     uint  &n         [[buffer(2)]],
    uint                tid       [[thread_position_in_threadgroup]],
    uint                tpg       [[threads_per_threadgroup]])
{
    threadgroup float warpV[32];
    threadgroup int   warpI[32];

    uint lane = tid & 31u;
    uint warp = tid >> 5;

    float bestV = -INFINITY;
    int bestI = 0;
    for (uint i = tid; i < n; i += tpg) {
        float v = logits[i];
        if (v > bestV || (v == bestV && (int)i < bestI)) { bestV = v; bestI = (int)i; }
    }

    for (uint off = 16u; off > 0u; off >>= 1) {
        float ov = simd_shuffle_xor(bestV, off);
        int oi = simd_shuffle_xor(bestI, off);
        if (ov > bestV || (ov == bestV && oi < bestI)) { bestV = ov; bestI = oi; }
    }
    if (lane == 0u) { warpV[warp] = bestV; warpI[warp] = bestI; }
    threadgroup_barrier(mem_flags::mem_threadgroup);

    if (warp == 0u) {
        uint nwarps = (tpg + 31u) >> 5;
        bestV = (tid < nwarps) ? warpV[lane] : -INFINITY;
        bestI = (tid < nwarps) ? warpI[lane] : 0;
        for (uint off = 16u; off > 0u; off >>= 1) {
            float ov = simd_shuffle_xor(bestV, off);
            int oi = simd_shuffle_xor(bestI, off);
            if (ov > bestV || (ov == bestV && oi < bestI)) { bestV = ov; bestI = oi; }
        }
        if (tid == 0u) outIdx[0] = bestI;
    }
}

// RoPE NORM (interleaved pairs): for each head, rotate (x[2i], x[2i+1]).
// Dispatch: threadgroups(nHeads, 1, 1), threadsPerThreadgroup(headDim/2, 1, 1).
kernel void rope_norm_f32(
    device       float *x        [[buffer(0)]],
    device const float *invFreq  [[buffer(1)]],
    constant     uint  &headDim  [[buffer(2)]],
    constant     uint  &pos      [[buffer(3)]],
    uint                h        [[threadgroup_position_in_grid]],
    uint                i        [[thread_position_in_threadgroup]])
{
    uint halfD = headDim >> 1;
    if (i >= halfD) return;
    uint base = h * headDim + 2u * i;
    float theta = (float)pos * invFreq[i];
    float c = precise::cos(theta);
    float s = precise::sin(theta);
    float a = x[base];
    float b = x[base + 1u];
    x[base]      = a * c - b * s;
    x[base + 1u] = a * s + b * c;
}

// RoPE NEOX (split halves): for each head, rotate (x[i], x[halfD+i]).
// Dispatch: threadgroups(nHeads, 1, 1), threadsPerThreadgroup(headDim/2, 1, 1).
kernel void rope_neox_f32(
    device       float *x        [[buffer(0)]],
    device const float *invFreq  [[buffer(1)]],
    constant     uint  &headDim  [[buffer(2)]],
    constant     uint  &pos      [[buffer(3)]],
    uint                h        [[threadgroup_position_in_grid]],
    uint                i        [[thread_position_in_threadgroup]])
{
    uint halfD = headDim >> 1;
    if (i >= halfD) return;
    uint base = h * headDim;
    float theta = (float)pos * invFreq[i];
    float c = precise::cos(theta);
    float s = precise::sin(theta);
    float a = x[base + i];
    float b = x[base + halfD + i];
    x[base + i]         = a * c - b * s;
    x[base + halfD + i] = a * s + b * c;
}

// Attention scores: one threadgroup per (head, pastPos) pair reduces
// dot(Q[h], K[t][kvh]) * scale into scores[h * scoreStride + t].
// Dispatch: threadgroups(nHeads, ctxLen, 1), threads(headDim, 1, 1).
// headDim must be a multiple of 32 (warp).
kernel void attn_scores_f32(
    device const float *q           [[buffer(0)]],
    device const float *kCache      [[buffer(1)]],
    device       float *scores      [[buffer(2)]],
    constant     uint  &headDim     [[buffer(3)]],
    constant     uint  &kvRowSize   [[buffer(4)]],
    constant     uint  &groupSize   [[buffer(5)]],
    constant     uint  &scoreStride [[buffer(6)]],
    constant     float &scale       [[buffer(7)]],
    uint3               gid3        [[threadgroup_position_in_grid]],
    uint3               tid3        [[thread_position_in_threadgroup]])
{
    threadgroup float warpV[32];

    uint h = gid3.x;
    uint t = gid3.y;
    uint tid = tid3.x;
    uint lane = tid & 31u;
    uint warp = tid >> 5;
    uint kvh = h / groupSize;
    uint qBase = h * headDim;
    ulong kBase = (ulong)t * (ulong)kvRowSize + (ulong)(kvh * headDim);

    float v = (tid < headDim) ? q[qBase + tid] * kCache[kBase + tid] : 0.0f;
    v = simd_sum(v);
    if (lane == 0u) warpV[warp] = v;
    threadgroup_barrier(mem_flags::mem_threadgroup);
    if (warp == 0u) {
        uint nwarps = (headDim + 31u) >> 5;
        v = (tid < nwarps) ? warpV[lane] : 0.0f;
        v = simd_sum(v);
        if (tid == 0u) scores[h * scoreStride + t] = v * scale;
    }
}

// Numerically-stable row softmax (in place). Dispatch: threadgroups(rows, 1, 1),
// threads(bs, 1, 1). bs must be a multiple of 32, ≤1024.
kernel void softmax_row_f32(
    device       float *scores   [[buffer(0)]],
    constant     uint  &cols     [[buffer(1)]],
    constant     uint  &stride   [[buffer(2)]],
    uint                r        [[threadgroup_position_in_grid]],
    uint                tid      [[thread_position_in_threadgroup]],
    uint                bs       [[threads_per_threadgroup]])
{
    threadgroup float warpMax[32];
    threadgroup float warpSum[32];
    threadgroup float sMax[1];
    threadgroup float sSum[1];

    uint lane = tid & 31u;
    uint warp = tid >> 5;
    device float *row = scores + r * stride;

    // Max
    float lmax = -INFINITY;
    for (uint i = tid; i < cols; i += bs) {
        float v = row[i];
        if (v > lmax) lmax = v;
    }
    for (uint off = 16u; off > 0u; off >>= 1) {
        float o = simd_shuffle_xor(lmax, off);
        if (o > lmax) lmax = o;
    }
    if (lane == 0u) warpMax[warp] = lmax;
    threadgroup_barrier(mem_flags::mem_threadgroup);
    if (warp == 0u) {
        uint nwarps = (bs + 31u) >> 5;
        lmax = (tid < nwarps) ? warpMax[lane] : -INFINITY;
        for (uint off = 16u; off > 0u; off >>= 1) {
            float o = simd_shuffle_xor(lmax, off);
            if (o > lmax) lmax = o;
        }
        if (tid == 0u) sMax[0] = lmax;
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
    float maxV = sMax[0];

    // Exp + sum
    float lsum = 0.0f;
    for (uint i = tid; i < cols; i += bs) {
        float e = precise::exp(row[i] - maxV);
        row[i] = e;
        lsum += e;
    }
    lsum = simd_sum(lsum);
    if (lane == 0u) warpSum[warp] = lsum;
    threadgroup_barrier(mem_flags::mem_threadgroup);
    if (warp == 0u) {
        uint nwarps = (bs + 31u) >> 5;
        lsum = (tid < nwarps) ? warpSum[lane] : 0.0f;
        lsum = simd_sum(lsum);
        if (tid == 0u) sSum[0] = lsum;
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);
    float invSum = 1.0f / sSum[0];
    for (uint i = tid; i < cols; i += bs) row[i] *= invSum;
}

// Q4_K embed_lookup: dequantize a single row of Q4_K super-blocks.
// 128 threads, single threadgroup; loops over dModel/256 super-blocks.
// dModel must be a multiple of 256.
kernel void embed_lookup_q4k_f32(
    device const uchar *embd    [[buffer(0)]],
    device       float *x       [[buffer(1)]],
    constant     uint  &tokenId [[buffer(2)]],
    constant     uint  &dModel  [[buffer(3)]],
    uint                tid     [[thread_position_in_threadgroup]])
{
    threadgroup float sD;
    threadgroup float sDmin;
    threadgroup uchar sScales[12];
    threadgroup uchar sQs[128];

    uint k_sblocks = dModel >> 8;
    device const uchar *rowBase = embd + (ulong)tokenId * (ulong)k_sblocks * 144u;

    for (uint sb = 0u; sb < k_sblocks; sb++) {
        device const uchar *blk = rowBase + (ulong)sb * 144u;
        if (tid == 0u) {
            ushort dh = (ushort)blk[0] | ((ushort)blk[1] << 8);
            sD = float(as_type<half>(dh));
        } else if (tid == 1u) {
            ushort dmh = (ushort)blk[2] | ((ushort)blk[3] << 8);
            sDmin = float(as_type<half>(dmh));
        } else if (tid < 14u) {
            sScales[tid - 2u] = blk[2u + tid];
        }
        if (tid < 128u) sQs[tid] = blk[16u + tid];
        threadgroup_barrier(mem_flags::mem_threadgroup);

        for (uint which = 0u; which < 2u; which++) {
            uint qi = tid + (which == 0u ? 0u : 128u);
            uint sb_idx = qi >> 5;
            uint element = qi & 31u;
            uint byte_idx = 32u * (sb_idx >> 1) + element;
            uchar byteVal = sQs[byte_idx];
            uint q = (sb_idx & 1u) ? ((uint)byteVal >> 4) : ((uint)byteVal & 0xFu);

            uint sc, mn;
            if (sb_idx < 4u) {
                sc = (uint)sScales[sb_idx] & 63u;
                mn = (uint)sScales[sb_idx + 4u] & 63u;
            } else {
                uint s_jp4 = (uint)sScales[sb_idx + 4u];
                uint s_jm4 = (uint)sScales[sb_idx - 4u];
                uint s_j   = (uint)sScales[sb_idx];
                sc = (s_jp4 & 0xFu) | (((s_jm4 >> 6) & 3u) << 4);
                mn = ((s_jp4 >> 4) & 0xFu) | (((s_j >> 6) & 3u) << 4);
            }
            x[sb * 256u + qi] = sD * (float)sc * (float)q - sDmin * (float)mn;
        }
        threadgroup_barrier(mem_flags::mem_threadgroup);
    }
}

// Q6_K embed_lookup: dequantize a single row of Q6_K super-blocks.
// 128 threads, single threadgroup; dModel must be a multiple of 256.
kernel void embed_lookup_q6k_f32(
    device const uchar *embd    [[buffer(0)]],
    device       float *x       [[buffer(1)]],
    constant     uint  &tokenId [[buffer(2)]],
    constant     uint  &dModel  [[buffer(3)]],
    uint                tid     [[thread_position_in_threadgroup]])
{
    threadgroup float sD;
    threadgroup char  sSc[16];
    threadgroup uchar sQl[128];
    threadgroup uchar sQh[64];

    uint k_sblocks = dModel >> 8;
    device const uchar *rowBase = embd + (ulong)tokenId * (ulong)k_sblocks * 210u;

    for (uint sb = 0u; sb < k_sblocks; sb++) {
        device const uchar *blk = rowBase + (ulong)sb * 210u;
        sQl[tid] = blk[tid];
        if (tid < 64u) sQh[tid] = blk[128u + tid];
        if (tid < 16u) sSc[tid] = (char)blk[192u + tid];
        if (tid == 0u) {
            ushort dh = (ushort)blk[208] | ((ushort)blk[209] << 8);
            sD = float(as_type<half>(dh));
        }
        threadgroup_barrier(mem_flags::mem_threadgroup);

        for (uint which_half = 0u; which_half < 2u; which_half++) {
            uint qi = tid + (which_half == 0u ? 0u : 128u);
            uint g = qi >> 7;
            uint i_in_g = qi & 127u;
            uint which = i_in_g >> 5;
            uint l = i_in_g & 31u;
            uint is = l >> 4;
            uint sc_idx = g * 8u + which * 2u + is;
            uint ql_idx = g * 64u + (which & 1u) * 32u + l;
            uint qh_idx = g * 32u + l;
            uint qh_shift = which * 2u;
            uint nibble = ((which >> 1) == 0u)
                ? ((uint)sQl[ql_idx] & 0xFu)
                : ((uint)sQl[ql_idx] >> 4);
            uint high2 = ((uint)sQh[qh_idx] >> qh_shift) & 3u;
            int q_byte = (int)(nibble | (high2 << 4));
            int q_signed = q_byte - 32;
            x[sb * 256u + qi] = sD * (float)sSc[sc_idx] * (float)q_signed;
        }
        threadgroup_barrier(mem_flags::mem_threadgroup);
    }
}

// Device-resident f32 matVec: y[r] = sum_c M[r*k + c] * x[c]. 128
// threads per threadgroup (4 warps), one threadgroup per row. float4
// vectorized loads (k must be a multiple of 4). Cross-warp reduction
// via a 4-element threadgroup partial array, then a second simd_sum
// collapses lanes 0..3 of warp 0.
kernel void matvec_dev_f32x4(
    device const float4 *mat     [[buffer(0)]],
    device const float4 *vec     [[buffer(1)]],
    device       float  *outPtr  [[buffer(2)]],
    constant     uint   &m       [[buffer(3)]],
    constant     uint   &k_div4  [[buffer(4)]],
    uint                 row     [[threadgroup_position_in_grid]],
    uint                 tid     [[thread_position_in_threadgroup]])
{
    threadgroup float warpSum[4];
    uint lane = tid & 31u;
    uint warp = tid >> 5;
    if (row >= m) return;

    device const float4 *mrow = mat + (ulong)row * (ulong)k_div4;
    float acc = 0.0f;
    for (uint i = tid; i < k_div4; i += 128u) {
        float4 m4 = mrow[i];
        float4 v4 = vec[i];
        acc = fma(m4.x, v4.x, acc);
        acc = fma(m4.y, v4.y, acc);
        acc = fma(m4.z, v4.z, acc);
        acc = fma(m4.w, v4.w, acc);
    }
    acc = simd_sum(acc);
    if (lane == 0u) warpSum[warp] = acc;
    threadgroup_barrier(mem_flags::mem_threadgroup);
    if (warp == 0u) {
        acc = (tid < 4u) ? warpSum[lane] : 0.0f;
        acc = simd_sum(acc);
        if (tid == 0u) outPtr[row] = acc;
    }
}

// Fused flash-attention. One TG per head, block = next-warp-multiple ≥
// headDim. Online softmax (Rabe & Staats) keeps running (max, sum, out);
// per-step correction rescales runSum/sOut when a new max arrives.
// headDim ≤ 256 (sQ/sOut sizing). nwarps ≤ 8 → warpRed[8].
kernel void flash_attn_f32(
    device const float *q          [[buffer(0)]],
    device const float *kCache     [[buffer(1)]],
    device const float *vCache     [[buffer(2)]],
    device       float *outv       [[buffer(3)]],
    constant     uint  &headDim    [[buffer(4)]],
    constant     uint  &kvRowSize  [[buffer(5)]],
    constant     uint  &groupSize  [[buffer(6)]],
    constant     uint  &ctxLen     [[buffer(7)]],
    constant     float &scale      [[buffer(8)]],
    uint                h          [[threadgroup_position_in_grid]],
    uint                tid        [[thread_position_in_threadgroup]],
    uint                bs         [[threads_per_threadgroup]])
{
    threadgroup float sQ[256];
    threadgroup float sOut[256];
    threadgroup float sScore;
    threadgroup float warpRed[8];

    uint lane = tid & 31u;
    uint warp = tid >> 5;
    uint nwarps = (bs + 31u) >> 5;
    uint kvh = h / groupSize;

    if (tid < headDim) {
        sQ[tid] = q[h * headDim + tid];
        sOut[tid] = 0.0f;
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);

    float runMax = -INFINITY;
    float runSum = 0.0f;

    for (uint t = 0u; t < ctxLen; t++) {
        float local = 0.0f;
        if (tid < headDim) {
            float kv = kCache[(ulong)t * (ulong)kvRowSize + (ulong)(kvh * headDim + tid)];
            local = sQ[tid] * kv;
        }
        local = simd_sum(local);
        if (lane == 0u) warpRed[warp] = local;
        threadgroup_barrier(mem_flags::mem_threadgroup);
        if (warp == 0u) {
            local = (tid < nwarps) ? warpRed[tid] : 0.0f;
            local = simd_sum(local);
            if (tid == 0u) sScore = local * scale;
        }
        threadgroup_barrier(mem_flags::mem_threadgroup);

        float score = sScore;
        float newMax = fmax(runMax, score);
        float correction = precise::exp(runMax - newMax);
        float e = precise::exp(score - newMax);
        runSum = runSum * correction + e;
        runMax = newMax;

        if (tid < headDim) {
            float vv = vCache[(ulong)t * (ulong)kvRowSize + (ulong)(kvh * headDim + tid)];
            sOut[tid] = sOut[tid] * correction + e * vv;
        }
    }

    if (tid < headDim) {
        outv[h * headDim + tid] = sOut[tid] / runSum;
    }
}

// out[h*headDim + i] = sum_t scores[h][t] * V[t][kvh][i]
// Dispatch: threadgroups(nHeads, 1, 1), threads(headDim, 1, 1).
kernel void attn_output_f32(
    device const float *scores      [[buffer(0)]],
    device const float *vCache      [[buffer(1)]],
    device       float *outv        [[buffer(2)]],
    constant     uint  &headDim     [[buffer(3)]],
    constant     uint  &kvRowSize   [[buffer(4)]],
    constant     uint  &groupSize   [[buffer(5)]],
    constant     uint  &ctxLen      [[buffer(6)]],
    constant     uint  &scoreStride [[buffer(7)]],
    uint                h           [[threadgroup_position_in_grid]],
    uint                i           [[thread_position_in_threadgroup]])
{
    if (i >= headDim) return;
    uint kvh = h / groupSize;
    uint vHeadOff = kvh * headDim + i;
    device const float *srow = scores + h * scoreStride;
    float acc = 0.0f;
    for (uint t = 0u; t < ctxLen; t++) {
        acc += srow[t] * vCache[(ulong)t * (ulong)kvRowSize + vHeadOff];
    }
    outv[h * headDim + i] = acc;
}

// ─── Secondary GPU primitives (gpu.ts public surface) ──────────────────
// Mirrors the CUDA reduce/argmin-argmax kernels in cuda.ts. Apple GPU
// idiom: simdgroup-wide reduces via simd_sum / simd_min / simd_max +
// simd_shuffle_xor; cross-warp merge through a 32-slot threadgroup
// buffer. Each kernel emits ONE per-threadgroup partial; the host sums
// (or extremum-merges) the small partial array (≤ REDUCE_GRID = 256).
//
// Block size 256 (= 8 simd warps). Grid size REDUCE_GRID = 256 →
// 65,536 threads, strided over arbitrary input length. Same dispatch
// shape across all of these so launchers can share boilerplate.

kernel void reduce_sum_f32(
    device const float *in        [[buffer(0)]],
    device       float *partials  [[buffer(1)]],
    constant     uint  &n         [[buffer(2)]],
    uint                tid       [[thread_position_in_threadgroup]],
    uint                tpg       [[threads_per_threadgroup]],
    uint                bid       [[threadgroup_position_in_grid]],
    uint                ngrp      [[threadgroups_per_grid]])
{
    threadgroup float warpAcc[32];
    uint lane = tid & 31u;
    uint warp = tid >> 5;
    uint stride = tpg * ngrp;
    uint start = bid * tpg + tid;

    float local = 0.0f;
    for (uint i = start; i < n; i += stride) local += in[i];
    local = simd_sum(local);
    if (lane == 0u) warpAcc[warp] = local;
    threadgroup_barrier(mem_flags::mem_threadgroup);

    if (warp == 0u) {
        uint nwarps = (tpg + 31u) >> 5;
        local = (tid < nwarps) ? warpAcc[lane] : 0.0f;
        local = simd_sum(local);
        if (tid == 0u) partials[bid] = local;
    }
}

kernel void reduce_min_f32(
    device const float *in        [[buffer(0)]],
    device       float *partials  [[buffer(1)]],
    constant     uint  &n         [[buffer(2)]],
    uint                tid       [[thread_position_in_threadgroup]],
    uint                tpg       [[threads_per_threadgroup]],
    uint                bid       [[threadgroup_position_in_grid]],
    uint                ngrp      [[threadgroups_per_grid]])
{
    threadgroup float warpAcc[32];
    uint lane = tid & 31u;
    uint warp = tid >> 5;
    uint stride = tpg * ngrp;
    uint start = bid * tpg + tid;

    float local = INFINITY;
    for (uint i = start; i < n; i += stride) {
        float v = in[i];
        local = fmin(local, v);
    }
    local = simd_min(local);
    if (lane == 0u) warpAcc[warp] = local;
    threadgroup_barrier(mem_flags::mem_threadgroup);

    if (warp == 0u) {
        uint nwarps = (tpg + 31u) >> 5;
        local = (tid < nwarps) ? warpAcc[lane] : INFINITY;
        local = simd_min(local);
        if (tid == 0u) partials[bid] = local;
    }
}

kernel void reduce_max_f32(
    device const float *in        [[buffer(0)]],
    device       float *partials  [[buffer(1)]],
    constant     uint  &n         [[buffer(2)]],
    uint                tid       [[thread_position_in_threadgroup]],
    uint                tpg       [[threads_per_threadgroup]],
    uint                bid       [[threadgroup_position_in_grid]],
    uint                ngrp      [[threadgroups_per_grid]])
{
    threadgroup float warpAcc[32];
    uint lane = tid & 31u;
    uint warp = tid >> 5;
    uint stride = tpg * ngrp;
    uint start = bid * tpg + tid;

    float local = -INFINITY;
    for (uint i = start; i < n; i += stride) {
        float v = in[i];
        local = fmax(local, v);
    }
    local = simd_max(local);
    if (lane == 0u) warpAcc[warp] = local;
    threadgroup_barrier(mem_flags::mem_threadgroup);

    if (warp == 0u) {
        uint nwarps = (tpg + 31u) >> 5;
        local = (tid < nwarps) ? warpAcc[lane] : -INFINITY;
        local = simd_max(local);
        if (tid == 0u) partials[bid] = local;
    }
}

// argmin / argmax — value+index pair tracked through the reduce. The
// simdgroup reduce uses simd_shuffle_xor pairwise compares so each
// lane sees both halves of the pair. Sentinel 0xffffffffu marks an
// uninitialised slot; ties broken by lower index (matches numpy /
// reduce conventions).
kernel void argmin_grid_f32(
    device const float *in        [[buffer(0)]],
    device       float *partialV  [[buffer(1)]],
    device       uint  *partialI  [[buffer(2)]],
    constant     uint  &n         [[buffer(3)]],
    uint                tid       [[thread_position_in_threadgroup]],
    uint                tpg       [[threads_per_threadgroup]],
    uint                bid       [[threadgroup_position_in_grid]],
    uint                ngrp      [[threadgroups_per_grid]])
{
    threadgroup float warpV[32];
    threadgroup uint  warpI[32];
    uint lane = tid & 31u;
    uint warp = tid >> 5;
    uint stride = tpg * ngrp;
    uint start = bid * tpg + tid;

    float bestV = INFINITY;
    uint  bestI = 0xffffffffu;
    for (uint i = start; i < n; i += stride) {
        float v = in[i];
        if (isnan(v)) continue;
        if (bestI == 0xffffffffu || v < bestV || (v == bestV && i < bestI)) {
            bestV = v;
            bestI = i;
        }
    }

    // Simdgroup tree-reduce: 16, 8, 4, 2, 1.
    for (uint s = 16u; s > 0u; s >>= 1) {
        float ov = simd_shuffle_xor(bestV, s);
        uint  oi = simd_shuffle_xor(bestI, s);
        bool better;
        if (oi == 0xffffffffu) better = false;
        else if (bestI == 0xffffffffu) better = true;
        else if (ov < bestV) better = true;
        else if (ov == bestV && oi < bestI) better = true;
        else better = false;
        if (better) { bestV = ov; bestI = oi; }
    }
    if (lane == 0u) {
        warpV[warp] = bestV;
        warpI[warp] = bestI;
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);

    if (warp == 0u) {
        uint nwarps = (tpg + 31u) >> 5;
        bestV = (tid < nwarps) ? warpV[lane] : INFINITY;
        bestI = (tid < nwarps) ? warpI[lane] : 0xffffffffu;
        for (uint s = 16u; s > 0u; s >>= 1) {
            float ov = simd_shuffle_xor(bestV, s);
            uint  oi = simd_shuffle_xor(bestI, s);
            bool better;
            if (oi == 0xffffffffu) better = false;
            else if (bestI == 0xffffffffu) better = true;
            else if (ov < bestV) better = true;
            else if (ov == bestV && oi < bestI) better = true;
            else better = false;
            if (better) { bestV = ov; bestI = oi; }
        }
        if (tid == 0u) {
            partialV[bid] = bestV;
            partialI[bid] = bestI;
        }
    }
}

kernel void argmax_grid_f32(
    device const float *in        [[buffer(0)]],
    device       float *partialV  [[buffer(1)]],
    device       uint  *partialI  [[buffer(2)]],
    constant     uint  &n         [[buffer(3)]],
    uint                tid       [[thread_position_in_threadgroup]],
    uint                tpg       [[threads_per_threadgroup]],
    uint                bid       [[threadgroup_position_in_grid]],
    uint                ngrp      [[threadgroups_per_grid]])
{
    threadgroup float warpV[32];
    threadgroup uint  warpI[32];
    uint lane = tid & 31u;
    uint warp = tid >> 5;
    uint stride = tpg * ngrp;
    uint start = bid * tpg + tid;

    float bestV = -INFINITY;
    uint  bestI = 0xffffffffu;
    for (uint i = start; i < n; i += stride) {
        float v = in[i];
        if (isnan(v)) continue;
        if (bestI == 0xffffffffu || v > bestV || (v == bestV && i < bestI)) {
            bestV = v;
            bestI = i;
        }
    }

    for (uint s = 16u; s > 0u; s >>= 1) {
        float ov = simd_shuffle_xor(bestV, s);
        uint  oi = simd_shuffle_xor(bestI, s);
        bool better;
        if (oi == 0xffffffffu) better = false;
        else if (bestI == 0xffffffffu) better = true;
        else if (ov > bestV) better = true;
        else if (ov == bestV && oi < bestI) better = true;
        else better = false;
        if (better) { bestV = ov; bestI = oi; }
    }
    if (lane == 0u) {
        warpV[warp] = bestV;
        warpI[warp] = bestI;
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);

    if (warp == 0u) {
        uint nwarps = (tpg + 31u) >> 5;
        bestV = (tid < nwarps) ? warpV[lane] : -INFINITY;
        bestI = (tid < nwarps) ? warpI[lane] : 0xffffffffu;
        for (uint s = 16u; s > 0u; s >>= 1) {
            float ov = simd_shuffle_xor(bestV, s);
            uint  oi = simd_shuffle_xor(bestI, s);
            bool better;
            if (oi == 0xffffffffu) better = false;
            else if (bestI == 0xffffffffu) better = true;
            else if (ov > bestV) better = true;
            else if (ov == bestV && oi < bestI) better = true;
            else better = false;
            if (better) { bestV = ov; bestI = oi; }
        }
        if (tid == 0u) {
            partialV[bid] = bestV;
            partialI[bid] = bestI;
        }
    }
}

// Atomic-privatized histogram. Each threadgroup builds a private bin
// array in threadgroup memory (atomic_uint), counts strided through
// its share of the input, then atomic-adds the local counts back to
// the global output. v1 caps bins at 1024 (= 4 KB threadgroup mem,
// well under the per-group 32 KB budget on Apple GPUs).
kernel void histogram_f32(
    device const float        *in        [[buffer(0)]],
    device       atomic_uint  *outBins   [[buffer(1)]],
    constant     uint         &n         [[buffer(2)]],
    constant     uint         &bins      [[buffer(3)]],
    constant     float        &minV      [[buffer(4)]],
    constant     float        &maxV      [[buffer(5)]],
    uint                       tid       [[thread_position_in_threadgroup]],
    uint                       tpg       [[threads_per_threadgroup]],
    uint                       bid       [[threadgroup_position_in_grid]],
    uint                       ngrp      [[threadgroups_per_grid]])
{
    threadgroup atomic_uint sBins[1024];

    // Zero the threadgroup histogram (only up to the runtime bin count).
    for (uint i = tid; i < bins && i < 1024u; i += tpg) {
        atomic_store_explicit(&sBins[i], 0u, memory_order_relaxed);
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);

    float range = maxV - minV;
    float scale = (range > 0.0f) ? (float)bins / range : 0.0f;
    uint stride = tpg * ngrp;
    uint start = bid * tpg + tid;
    for (uint i = start; i < n; i += stride) {
        float v = in[i];
        if (isnan(v) || v < minV || v >= maxV) continue;
        uint b = (uint)((v - minV) * scale);
        if (b >= bins) b = bins - 1u;
        atomic_fetch_add_explicit(&sBins[b], 1u, memory_order_relaxed);
    }
    threadgroup_barrier(mem_flags::mem_threadgroup);

    // Spill threadgroup histogram into output. Skipping zero-count
    // bins shaves a global atomic when most threadgroups don't see
    // every bin (sparse-bin inputs).
    for (uint i = tid; i < bins && i < 1024u; i += tpg) {
        uint c = atomic_load_explicit(&sBins[i], memory_order_relaxed);
        if (c != 0u) atomic_fetch_add_explicit(&outBins[i], c, memory_order_relaxed);
    }
}

// Pass 2 of two-pass variance: Σ (x - mean)² with a precomputed mean.
// Pass 1 is reduce_sum_f32 → host divides by n. Pass 2 emits
// per-block partials; host sums + divides by (n - ddof). Matches
// cuda.ts variance_sumsq_f32.
kernel void variance_sumsq_f32(
    device const float *in        [[buffer(0)]],
    device       float *partials  [[buffer(1)]],
    constant     uint  &n         [[buffer(2)]],
    constant     float &mean      [[buffer(3)]],
    uint                tid       [[thread_position_in_threadgroup]],
    uint                tpg       [[threads_per_threadgroup]],
    uint                bid       [[threadgroup_position_in_grid]],
    uint                ngrp      [[threadgroups_per_grid]])
{
    threadgroup float warpAcc[32];
    uint lane = tid & 31u;
    uint warp = tid >> 5;
    uint stride = tpg * ngrp;
    uint start = bid * tpg + tid;

    float local = 0.0f;
    for (uint i = start; i < n; i += stride) {
        float d = in[i] - mean;
        local += d * d;
    }
    local = simd_sum(local);
    if (lane == 0u) warpAcc[warp] = local;
    threadgroup_barrier(mem_flags::mem_threadgroup);

    if (warp == 0u) {
        uint nwarps = (tpg + 31u) >> 5;
        local = (tid < nwarps) ? warpAcc[lane] : 0.0f;
        local = simd_sum(local);
        if (tid == 0u) partials[bid] = local;
    }
}

// ─── Scan (inclusive prefix sum) — three kernels ────────────────────
// Mirrors cuda.ts's scan trio. Caller iterates a recursive
// scanDeviceInPlaceF32 that bottoms out at the leaf cap (1024 elems
// = the single-block scan). Block size SCAN_BLOCK = 256.
//
//   1. scan_block_inclusive_f32 — per-block Hillis-Steele scan; block i
//      writes its grand total to blockSums[i].
//   2. scan_blocksums_inclusive_f32 — single-block scan over blockSums
//      (host pads blockDim to nextPow2; kernel internally pads reads
//      with 0 for tid >= numBlocks).
//   3. scan_add_offsets_f32 — block i ≥ 1 picks up blockSums[i-1] (now
//      an exclusive prefix offset) and adds it to its segment.

kernel void scan_block_inclusive_f32(
    device const float *in         [[buffer(0)]],
    device       float *out        [[buffer(1)]],
    device       float *blockSums  [[buffer(2)]],
    constant     uint  &n          [[buffer(3)]],
    uint                tid        [[thread_position_in_threadgroup]],
    uint                bid        [[threadgroup_position_in_grid]],
    uint                tpg        [[threads_per_threadgroup]])
{
    threadgroup float sdata[256];
    uint idx = bid * tpg + tid;

    sdata[tid] = (idx < n) ? in[idx] : 0.0f;
    threadgroup_barrier(mem_flags::mem_threadgroup);

    // Hillis-Steele inclusive scan: log2(tpg) read-then-sync-then-add steps.
    for (uint s = 1u; s < tpg; s <<= 1) {
        float v = (tid >= s) ? sdata[tid - s] : 0.0f;
        threadgroup_barrier(mem_flags::mem_threadgroup);
        sdata[tid] += v;
        threadgroup_barrier(mem_flags::mem_threadgroup);
    }

    if (idx < n) out[idx] = sdata[tid];
    if (tid == tpg - 1u) blockSums[bid] = sdata[tid];
}

kernel void scan_blocksums_inclusive_f32(
    device       float *blockSums  [[buffer(0)]],
    constant     uint  &numBlocks  [[buffer(1)]],
    uint                tid        [[thread_position_in_threadgroup]],
    uint                tpg        [[threads_per_threadgroup]])
{
    threadgroup float sdata[1024];
    sdata[tid] = (tid < numBlocks) ? blockSums[tid] : 0.0f;
    threadgroup_barrier(mem_flags::mem_threadgroup);

    for (uint s = 1u; s < tpg; s <<= 1) {
        float v = (tid >= s) ? sdata[tid - s] : 0.0f;
        threadgroup_barrier(mem_flags::mem_threadgroup);
        sdata[tid] += v;
        threadgroup_barrier(mem_flags::mem_threadgroup);
    }
    if (tid < numBlocks) blockSums[tid] = sdata[tid];
}

kernel void scan_add_offsets_f32(
    device       float *out        [[buffer(0)]],
    device const float *blockSums  [[buffer(1)]],
    constant     uint  &n          [[buffer(2)]],
    uint                tid        [[thread_position_in_threadgroup]],
    uint                bid        [[threadgroup_position_in_grid]],
    uint                tpg        [[threads_per_threadgroup]])
{
    if (bid == 0u) return;
    uint idx = bid * tpg + tid;
    if (idx < n) out[idx] += blockSums[bid - 1u];
}

// One step of bitonic sort, in-place ascending. Caller pads input to a
// power of 2 with +Inf and runs the canonical k = 2..n, j = k/2..1
// sequence — log²(n) launches. Mirrors cuda.ts's bitonic_step_f32.
kernel void bitonic_step_f32(
    device       float *arr  [[buffer(0)]],
    constant     uint  &j    [[buffer(1)]],
    constant     uint  &k    [[buffer(2)]],
    constant     uint  &n    [[buffer(3)]],
    uint                gid  [[thread_position_in_grid]])
{
    if (gid >= n) return;
    uint ixj = gid ^ j;
    if (ixj <= gid || ixj >= n) return;

    bool ascending = (gid & k) == 0u;
    float vi = arr[gid];
    float vixj = arr[ixj];

    bool swap = ascending ? (vi > vixj) : (vi < vixj);
    if (swap) {
        arr[gid] = vixj;
        arr[ixj] = vi;
    }
}
`;

// ─── FFI: base symbols ─────────────────────────────────────────────────────
// Anything not requiring objc_msgSend lives here. We use separate dlopen
// calls below for each objc_msgSend signature we need.

type MetalSymbols = {
  MTLCreateSystemDefaultDevice: () => bigint;
};

type ObjcBaseSymbols = {
  sel_registerName: (name: number) => bigint;
  objc_getClass: (name: number) => bigint;
};

type MsgSend_id_SEL = (self: bigint, op: bigint) => bigint;
type MsgSend_id_SEL_id = (self: bigint, op: bigint, a1: bigint) => bigint;
type MsgSend_id_SEL_id_id_ptr = (self: bigint, op: bigint, a1: bigint, a2: bigint, a3: number | null) => bigint;
type MsgSend_id_SEL_id_ptr = (self: bigint, op: bigint, a1: bigint, a2: number | null) => bigint;
type MsgSend_id_SEL_id_u64_u64 = (self: bigint, op: bigint, a1: bigint, a2: bigint, a3: bigint) => bigint;
type MsgSend_id_SEL_ptr_u64_u64 = (self: bigint, op: bigint, a1: number, a2: bigint, a3: bigint) => void;
type MsgSend_id_SEL_ptr_u64_u64_ret = (self: bigint, op: bigint, a1: number, a2: bigint, a3: bigint) => bigint;
type MsgSend_id_SEL_u64_u64 = (self: bigint, op: bigint, a1: bigint, a2: bigint) => bigint;
type MsgSend_id_SEL_ptr_ptr = (self: bigint, op: bigint, a1: number, a2: number) => void;
// newBufferWithBytesNoCopy:length:options:deallocator: — 6 args, all u64,
// returns id. The `deallocator` block is passed as 0n (nil) since alloc()
// owns the memory for the backend's lifetime.
type MsgSend_id_SEL_u64_u64_u64_u64 = (
  self: bigint,
  op: bigint,
  a1: bigint,
  a2: bigint,
  a3: bigint,
  a4: bigint,
) => bigint;

let metalLib: { symbols: MetalSymbols; close: () => void } | null = null;
let objcBase: { symbols: ObjcBaseSymbols; close: () => void } | null = null;
let ffiPtr: ((x: any) => number) | null = null;
let ffiToArrayBuffer: ((ptr: number, off: number, len: number) => ArrayBuffer) | null = null;
let CStringCtor: any = null;

// Typed objc_msgSend variants. Each is the SAME underlying libobjc symbol
// loaded under a different bun:ffi type signature — arm64's objc_msgSend
// has no vararg runtime dispatch, so this is safe.
let msgSend_2: MsgSend_id_SEL | null = null; // (id, SEL) -> id
let msgSend_3_id: MsgSend_id_SEL_id | null = null; // (id, SEL, id) -> id
let msgSend_4_id_ptr: MsgSend_id_SEL_id_ptr | null = null; // (id, SEL, id, ptr) -> id
let msgSend_5_id_id_ptr: MsgSend_id_SEL_id_id_ptr | null = null; // (id, SEL, id, id, ptr) -> id
let msgSend_5_id_u64_u64: MsgSend_id_SEL_id_u64_u64 | null = null; // (id, SEL, id, u64, u64) -> void
let msgSend_5_ptr_u64_u64: MsgSend_id_SEL_ptr_u64_u64 | null = null; // (id, SEL, ptr, u64, u64) -> void (setBytes:length:atIndex:)
let msgSend_5_ptr_u64_u64_ret: MsgSend_id_SEL_ptr_u64_u64_ret | null = null; // same shape, but id return (newBufferWithBytes:length:options:)
let msgSend_4_u64_u64: MsgSend_id_SEL_u64_u64 | null = null; // (id, SEL, u64, u64) -> id
let msgSend_4_ptr_ptr: MsgSend_id_SEL_ptr_ptr | null = null; // (id, SEL, ptr, ptr) -> void
let msgSend_6_u64x4: MsgSend_id_SEL_u64_u64_u64_u64 | null = null; // newBufferWithBytesNoCopy:length:options:deallocator:

// libc bindings for page-aligned allocation (posix_memalign + getpagesize).
// Loaded lazily inside tryLoad() to avoid paying the dlopen cost on non-
// darwin hosts or when alloc() is never called.
type LibcSymbols = {
  posix_memalign: (out: number, alignment: bigint, size: bigint) => number;
  free: (ptr: bigint) => void;
  getpagesize: () => number;
};
let libc: { symbols: LibcSymbols; close: () => void } | null = null;
let pageSize = 16384;

// ─── State ────────────────────────────────────────────────────────────────

let probed = false;
let probeResult = false;
let device: bigint = 0n;
let deviceName = "";
// [device hasUnifiedMemory] — true on Apple Silicon (the CPU and GPU share a
// single physical DRAM pool, so Shared-storage MTLBuffers are truly
// zero-copy) and false on discrete-GPU Intel Macs (where Shared storage
// still works but the driver DMAs over PCIe on each dispatch, which is
// what the ticket's 2-4× claim is calibrated *against*). The probe result
// is informational today — the backend uses Shared everywhere regardless —
// but callers can read it via getHasUnifiedMemory() to decide whether to
// bother staging inputs through alloc() + hold() for the NOCOPY path.
let hasUnifiedMemory = false;
let commandQueue: bigint = 0n;
let metalLibraryObj: bigint = 0n;
// simdMap kernel
let simdMapFn: bigint = 0n;
let simdMapPipeline: bigint = 0n;
let simdMapMaxTg = 1024;
// matVec kernel — threadgroup size is fixed at 32 (one simdgroup on
// Apple Silicon), so the pipeline's maxTotalThreadsPerThreadgroup is
// probed but not consulted at launch time.
let matVecFn: bigint = 0n;
let matVecPipeline: bigint = 0n;
let matmulFn: bigint = 0n;
let matmulPipeline: bigint = 0n;
let conv2DFn: bigint = 0n;
let conv2DPipeline: bigint = 0n;
let gaussianBlurRGBAu8Fn: bigint = 0n;
let gaussianBlurRGBAu8Pipeline: bigint = 0n;
let matVecQ4KFn: bigint = 0n;
let matVecQ4KPipeline: bigint = 0n;
let matVecQ6KFn: bigint = 0n;
let matVecQ6KPipeline: bigint = 0n;

// Secondary GPU primitives — gpu.ts public surface (reduce / argMin /
// argMax). Loaded at probe; null until then. Each `0n` is the
// "uncompiled / unavailable" sentinel that the launchers check before
// dispatch; missing pipelines collapse to a CPU fallback upstream.
let reduceSumFn: bigint = 0n;
let reduceSumPipeline: bigint = 0n;
let reduceMinFn: bigint = 0n;
let reduceMinPipeline: bigint = 0n;
let reduceMaxFn: bigint = 0n;
let reduceMaxPipeline: bigint = 0n;
let argminGridFn: bigint = 0n;
let argminGridPipeline: bigint = 0n;
let argmaxGridFn: bigint = 0n;
let argmaxGridPipeline: bigint = 0n;
let histogramFn: bigint = 0n;
let histogramPipeline: bigint = 0n;
let varianceSumsqFn: bigint = 0n;
let varianceSumsqPipeline: bigint = 0n;
let scanBlockInclusiveFn: bigint = 0n;
let scanBlockInclusivePipeline: bigint = 0n;
let scanBlocksumsInclusiveFn: bigint = 0n;
let scanBlocksumsInclusivePipeline: bigint = 0n;
let scanAddOffsetsFn: bigint = 0n;
let scanAddOffsetsPipeline: bigint = 0n;
let bitonicStepFn: bigint = 0n;
let bitonicStepPipeline: bigint = 0n;

// ─── devOps state ───────────────────────────────────────────────────────
// Map of kernel name → { fn, pipe } for each kernel compiled at probe
// time. `devOpsComplete` flips to true only once every kernel in the
// canonical list has compiled successfully — guards getDevOps() so
// parabun:llm doesn't flip to a partial Metal path.
const devOpsPipes: Record<string, { fn: bigint; pipe: bigint }> = {};
let devOpsComplete = false;

// The canonical devOps kernel list, matching CUDA's surface. Each entry
// is [ exposed-name, MSL-function-name ]. getDevOps() iterates this in
// order; any missing entry keeps the full surface disabled.
const DEV_OPS_KERNELS: ReadonlyArray<readonly [string, string]> = [
  ["embedLookup", "embed_lookup_f32"],
  ["accum", "accum_f32"],
  ["biasAdd", "bias_add_f32"],
  ["siluMul", "silu_mul_f32"],
  ["add", "add_f32"],
  ["kvStore", "kv_store_f32"],
  ["rmsnorm", "rmsnorm_f32"],
  ["argmax", "argmax_f32"],
  ["ropeNorm", "rope_norm_f32"],
  ["ropeNeox", "rope_neox_f32"],
  ["attnScores", "attn_scores_f32"],
  ["softmaxRow", "softmax_row_f32"],
  ["attnOutput", "attn_output_f32"],
  ["matVec", "matvec_dev_f32x4"],
  ["embedLookupQ4K", "embed_lookup_q4k_f32"],
  ["embedLookupQ6K", "embed_lookup_q6k_f32"],
  ["flashAttn", "flash_attn_f32"],
];

// Kernels that need a host-side launch wrapper once all of DEV_OPS_KERNELS
// are present. Listed here so intermediate commits don't claim a
// partially-wired devOps surface. Flip to true in the commit that lands
// the final kernel.
const DEV_OPS_CANONICAL_COMPLETE = true;

function tryLoad(): boolean {
  if (metalLib !== null && objcBase !== null) return true;
  try {
    const { dlopen, FFIType, ptr, CString, toArrayBuffer } = require("../ffi.ts");
    ffiPtr = ptr;
    CStringCtor = CString;
    ffiToArrayBuffer = toArrayBuffer;

    metalLib = dlopen(METAL_FRAMEWORK, {
      MTLCreateSystemDefaultDevice: { args: [], returns: FFIType.u64 },
    }) as any;

    objcBase = dlopen(LIBOBJC, {
      sel_registerName: { args: [FFIType.ptr], returns: FFIType.u64 },
      objc_getClass: { args: [FFIType.ptr], returns: FFIType.u64 },
    }) as any;

    // Per-signature objc_msgSend wrappers — same underlying symbol,
    // different bun:ffi marshaling. arm64 has one objc_msgSend address;
    // each dlopen produces an independent JIT wrapper.
    msgSend_2 = dlopen(LIBOBJC, {
      objc_msgSend: { args: [FFIType.u64, FFIType.u64], returns: FFIType.u64 },
    }).symbols.objc_msgSend as any;
    msgSend_3_id = dlopen(LIBOBJC, {
      objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.u64], returns: FFIType.u64 },
    }).symbols.objc_msgSend as any;
    msgSend_4_id_ptr = dlopen(LIBOBJC, {
      objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.ptr], returns: FFIType.u64 },
    }).symbols.objc_msgSend as any;
    msgSend_5_id_id_ptr = dlopen(LIBOBJC, {
      objc_msgSend: {
        args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.ptr],
        returns: FFIType.u64,
      },
    }).symbols.objc_msgSend as any;
    msgSend_5_id_u64_u64 = dlopen(LIBOBJC, {
      objc_msgSend: {
        args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64],
        returns: FFIType.void,
      },
    }).symbols.objc_msgSend as any;
    msgSend_5_ptr_u64_u64 = dlopen(LIBOBJC, {
      objc_msgSend: {
        args: [FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.u64, FFIType.u64],
        returns: FFIType.void,
      },
    }).symbols.objc_msgSend as any;
    msgSend_5_ptr_u64_u64_ret = dlopen(LIBOBJC, {
      objc_msgSend: {
        args: [FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.u64, FFIType.u64],
        returns: FFIType.u64,
      },
    }).symbols.objc_msgSend as any;
    msgSend_4_u64_u64 = dlopen(LIBOBJC, {
      objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64], returns: FFIType.u64 },
    }).symbols.objc_msgSend as any;
    msgSend_4_ptr_ptr = dlopen(LIBOBJC, {
      objc_msgSend: { args: [FFIType.u64, FFIType.u64, FFIType.ptr, FFIType.ptr], returns: FFIType.void },
    }).symbols.objc_msgSend as any;
    msgSend_6_u64x4 = dlopen(LIBOBJC, {
      objc_msgSend: {
        args: [FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64, FFIType.u64],
        returns: FFIType.u64,
      },
    }).symbols.objc_msgSend as any;

    libc = dlopen("libc.dylib", {
      posix_memalign: { args: [FFIType.ptr, FFIType.u64, FFIType.u64], returns: FFIType.i32 },
      free: { args: [FFIType.u64], returns: FFIType.void },
      getpagesize: { args: [], returns: FFIType.i32 },
    }) as any;
    pageSize = libc!.symbols.getpagesize();

    return true;
  } catch {
    metalLib = null;
    objcBase = null;
    libc = null;
    return false;
  }
}

// ─── Selector cache ────────────────────────────────────────────────────────

const selCache = new Map<string, bigint>();
function sel(name: string): bigint {
  const hit = selCache.get(name);
  if (hit !== undefined) return hit;
  const bytes = new TextEncoder().encode(name + "\0");
  const s = objcBase!.symbols.sel_registerName(ffiPtr!(bytes));
  selCache.set(name, s);
  return s;
}

function cls(name: string): bigint {
  const bytes = new TextEncoder().encode(name + "\0");
  return objcBase!.symbols.objc_getClass(ffiPtr!(bytes));
}

// NSString from a UTF-8 buffer: [[NSString alloc] initWithUTF8String:]
function nsstring(text: string): bigint {
  const nsStringCls = cls("NSString");
  if (nsStringCls === 0n) return 0n;
  const allocated = msgSend_2!(nsStringCls, sel("alloc"));
  if (allocated === 0n) return 0n;
  const bytes = new TextEncoder().encode(text + "\0");
  return msgSend_3_id!(allocated, sel("initWithUTF8String:"), BigInt(ffiPtr!(bytes)));
}

function objcRelease(obj: bigint): void {
  if (obj !== 0n) msgSend_2!(obj, sel("release"));
}

// ─── Probe + one-time kernel compile ───────────────────────────────────────

function probe(): boolean {
  if (probed) return probeResult;
  probed = true;
  if (process.platform !== "darwin") return false;
  if (!tryLoad()) return false;

  const dev = metalLib!.symbols.MTLCreateSystemDefaultDevice();
  if (dev === 0n) return false;
  device = dev;

  // [[device name] UTF8String] → const char*
  const nsstr = msgSend_2!(dev, sel("name"));
  if (nsstr !== 0n) {
    const cstr = msgSend_2!(nsstr, sel("UTF8String"));
    if (cstr !== 0n) {
      try {
        deviceName = String(new CStringCtor(Number(cstr)));
      } catch {
        deviceName = "";
      }
    }
  }

  // hasUnifiedMemory is an MTLDevice BOOL property (macOS 10.15+). BOOL
  // on arm64 returns in the low byte of x0; objc_msgSend returning u64
  // zero-extends, so !== 0n is the correct truthiness test.
  hasUnifiedMemory = msgSend_2!(dev, sel("hasUnifiedMemory")) !== 0n;

  // Compile MSL: [device newLibraryWithSource:source options:nil error:&err]
  // `error` is an NSError** out-param — we pass null and inspect the return.
  const source = nsstring(MSL_SOURCE);
  if (source === 0n) return false;
  const lib = msgSend_5_id_id_ptr!(dev, sel("newLibraryWithSource:options:error:"), source, 0n, null);
  objcRelease(source);
  if (lib === 0n) return false;
  metalLibraryObj = lib;

  // Compile both pipelines from the single library. One failure on either
  // pipeline unwinds everything — we either have both kernels or neither.
  const sm = compileKernel(lib, "simdMapAffineF32");
  if (sm === null) {
    objcRelease(lib);
    metalLibraryObj = 0n;
    return false;
  }
  simdMapFn = sm.fn;
  simdMapPipeline = sm.pipe;
  simdMapMaxTg = sm.maxTg;

  const mv = compileKernel(lib, "matVecF32");
  if (mv === null) {
    objcRelease(simdMapPipeline);
    objcRelease(simdMapFn);
    objcRelease(lib);
    simdMapPipeline = 0n;
    simdMapFn = 0n;
    metalLibraryObj = 0n;
    return false;
  }
  matVecFn = mv.fn;
  matVecPipeline = mv.pipe;

  const mm = compileKernel(lib, "matmulF32");
  if (mm === null) {
    objcRelease(matVecPipeline);
    objcRelease(matVecFn);
    objcRelease(simdMapPipeline);
    objcRelease(simdMapFn);
    objcRelease(lib);
    matVecPipeline = 0n;
    matVecFn = 0n;
    simdMapPipeline = 0n;
    simdMapFn = 0n;
    metalLibraryObj = 0n;
    return false;
  }
  matmulFn = mm.fn;
  matmulPipeline = mm.pipe;

  const cv = compileKernel(lib, "conv2d_f32");
  if (cv === null) {
    objcRelease(matmulPipeline);
    objcRelease(matmulFn);
    objcRelease(matVecPipeline);
    objcRelease(matVecFn);
    objcRelease(simdMapPipeline);
    objcRelease(simdMapFn);
    objcRelease(lib);
    matmulPipeline = 0n;
    matmulFn = 0n;
    matVecPipeline = 0n;
    matVecFn = 0n;
    simdMapPipeline = 0n;
    simdMapFn = 0n;
    metalLibraryObj = 0n;
    return false;
  }
  conv2DFn = cv.fn;
  conv2DPipeline = cv.pipe;

  // Image-specific RGBA blur kernel — same optional-at-probe-time
  // semantics as the quantized kernels below. If it doesn't compile
  // we still return a usable backend with imageBlurRGBA falling back
  // to the public wrapper's CPU path.
  const gb = compileKernel(lib, "gaussian_blur_rgba_u8");
  if (gb !== null) {
    gaussianBlurRGBAu8Fn = gb.fn;
    gaussianBlurRGBAu8Pipeline = gb.pipe;
  }

  // Quantized matVec kernels. These are optional at the probe layer —
  // if the device's MSL compiler can't handle the Q-K source (shouldn't
  // happen on any Apple Silicon / Intel Mac GPU shipped in the last 5
  // years), we still return a usable backend without the holdQ4K /
  // holdQ6K path.
  const mvQ4 = compileKernel(lib, "matVecQ4KF32");
  if (mvQ4 !== null) {
    matVecQ4KFn = mvQ4.fn;
    matVecQ4KPipeline = mvQ4.pipe;
  }
  const mvQ6 = compileKernel(lib, "matVecQ6KF32");
  if (mvQ6 !== null) {
    matVecQ6KFn = mvQ6.fn;
    matVecQ6KPipeline = mvQ6.pipe;
  }

  // Secondary GPU primitives (gpu.ts public surface). Optional at the
  // probe layer — failure to compile any of these collapses the
  // corresponding launcher to a `null pipeline` check, the launcher
  // returns null, and the gpu.ts public wrapper falls through to the
  // CPU reference. This means a Metal device that can't compile (say)
  // argmin still ships matVec/conv2D etc.
  const rs = compileKernel(lib, "reduce_sum_f32");
  if (rs !== null) {
    reduceSumFn = rs.fn;
    reduceSumPipeline = rs.pipe;
  }
  const rmin = compileKernel(lib, "reduce_min_f32");
  if (rmin !== null) {
    reduceMinFn = rmin.fn;
    reduceMinPipeline = rmin.pipe;
  }
  const rmax = compileKernel(lib, "reduce_max_f32");
  if (rmax !== null) {
    reduceMaxFn = rmax.fn;
    reduceMaxPipeline = rmax.pipe;
  }
  const amin = compileKernel(lib, "argmin_grid_f32");
  if (amin !== null) {
    argminGridFn = amin.fn;
    argminGridPipeline = amin.pipe;
  }
  const amax = compileKernel(lib, "argmax_grid_f32");
  if (amax !== null) {
    argmaxGridFn = amax.fn;
    argmaxGridPipeline = amax.pipe;
  }
  const hgr = compileKernel(lib, "histogram_f32");
  if (hgr !== null) {
    histogramFn = hgr.fn;
    histogramPipeline = hgr.pipe;
  }
  const vsq = compileKernel(lib, "variance_sumsq_f32");
  if (vsq !== null) {
    varianceSumsqFn = vsq.fn;
    varianceSumsqPipeline = vsq.pipe;
  }
  const sbi = compileKernel(lib, "scan_block_inclusive_f32");
  if (sbi !== null) {
    scanBlockInclusiveFn = sbi.fn;
    scanBlockInclusivePipeline = sbi.pipe;
  }
  const sbsi = compileKernel(lib, "scan_blocksums_inclusive_f32");
  if (sbsi !== null) {
    scanBlocksumsInclusiveFn = sbsi.fn;
    scanBlocksumsInclusivePipeline = sbsi.pipe;
  }
  const sao = compileKernel(lib, "scan_add_offsets_f32");
  if (sao !== null) {
    scanAddOffsetsFn = sao.fn;
    scanAddOffsetsPipeline = sao.pipe;
  }
  const bts = compileKernel(lib, "bitonic_step_f32");
  if (bts !== null) {
    bitonicStepFn = bts.fn;
    bitonicStepPipeline = bts.pipe;
  }

  // devOps kernels. Each is optional at the probe layer — partial
  // compilation is fine, getDevOps() enforces the all-or-nothing
  // rule that parabun:llm needs.
  let devOpsCount = 0;
  for (const [name, mslName] of DEV_OPS_KERNELS) {
    const k = compileKernel(lib, mslName);
    if (k !== null) {
      devOpsPipes[name] = { fn: k.fn, pipe: k.pipe };
      devOpsCount++;
    }
  }
  devOpsComplete = devOpsCount === DEV_OPS_KERNELS.length && DEV_OPS_CANONICAL_COMPLETE;

  const queue = msgSend_2!(dev, sel("newCommandQueue"));
  if (queue === 0n) {
    if (matVecQ6KPipeline !== 0n) objcRelease(matVecQ6KPipeline);
    if (matVecQ6KFn !== 0n) objcRelease(matVecQ6KFn);
    if (matVecQ4KPipeline !== 0n) objcRelease(matVecQ4KPipeline);
    if (matVecQ4KFn !== 0n) objcRelease(matVecQ4KFn);
    objcRelease(conv2DPipeline);
    objcRelease(conv2DFn);
    objcRelease(matmulPipeline);
    objcRelease(matmulFn);
    objcRelease(matVecPipeline);
    objcRelease(matVecFn);
    objcRelease(simdMapPipeline);
    objcRelease(simdMapFn);
    objcRelease(lib);
    matVecQ6KPipeline = 0n;
    matVecQ6KFn = 0n;
    matVecQ4KPipeline = 0n;
    matVecQ4KFn = 0n;
    if (reduceSumPipeline !== 0n) objcRelease(reduceSumPipeline);
    if (reduceSumFn !== 0n) objcRelease(reduceSumFn);
    if (reduceMinPipeline !== 0n) objcRelease(reduceMinPipeline);
    if (reduceMinFn !== 0n) objcRelease(reduceMinFn);
    if (reduceMaxPipeline !== 0n) objcRelease(reduceMaxPipeline);
    if (reduceMaxFn !== 0n) objcRelease(reduceMaxFn);
    if (argminGridPipeline !== 0n) objcRelease(argminGridPipeline);
    if (argminGridFn !== 0n) objcRelease(argminGridFn);
    if (argmaxGridPipeline !== 0n) objcRelease(argmaxGridPipeline);
    if (argmaxGridFn !== 0n) objcRelease(argmaxGridFn);
    if (histogramPipeline !== 0n) objcRelease(histogramPipeline);
    if (histogramFn !== 0n) objcRelease(histogramFn);
    if (varianceSumsqPipeline !== 0n) objcRelease(varianceSumsqPipeline);
    if (varianceSumsqFn !== 0n) objcRelease(varianceSumsqFn);
    if (scanBlockInclusivePipeline !== 0n) objcRelease(scanBlockInclusivePipeline);
    if (scanBlockInclusiveFn !== 0n) objcRelease(scanBlockInclusiveFn);
    if (scanBlocksumsInclusivePipeline !== 0n) objcRelease(scanBlocksumsInclusivePipeline);
    if (scanBlocksumsInclusiveFn !== 0n) objcRelease(scanBlocksumsInclusiveFn);
    if (scanAddOffsetsPipeline !== 0n) objcRelease(scanAddOffsetsPipeline);
    if (scanAddOffsetsFn !== 0n) objcRelease(scanAddOffsetsFn);
    if (bitonicStepPipeline !== 0n) objcRelease(bitonicStepPipeline);
    if (bitonicStepFn !== 0n) objcRelease(bitonicStepFn);
    reduceSumPipeline = 0n;
    reduceSumFn = 0n;
    reduceMinPipeline = 0n;
    reduceMinFn = 0n;
    reduceMaxPipeline = 0n;
    reduceMaxFn = 0n;
    argminGridPipeline = 0n;
    argminGridFn = 0n;
    argmaxGridPipeline = 0n;
    argmaxGridFn = 0n;
    histogramPipeline = 0n;
    histogramFn = 0n;
    varianceSumsqPipeline = 0n;
    varianceSumsqFn = 0n;
    scanBlockInclusivePipeline = 0n;
    scanBlockInclusiveFn = 0n;
    scanBlocksumsInclusivePipeline = 0n;
    scanBlocksumsInclusiveFn = 0n;
    scanAddOffsetsPipeline = 0n;
    scanAddOffsetsFn = 0n;
    bitonicStepPipeline = 0n;
    bitonicStepFn = 0n;
    conv2DPipeline = 0n;
    conv2DFn = 0n;
    matmulPipeline = 0n;
    matmulFn = 0n;
    matVecPipeline = 0n;
    matVecFn = 0n;
    simdMapPipeline = 0n;
    simdMapFn = 0n;
    metalLibraryObj = 0n;
    return false;
  }
  commandQueue = queue;

  probeResult = true;
  return true;
}

function compileKernel(lib: bigint, name: string): { fn: bigint; pipe: bigint; maxTg: number } | null {
  const nsName = nsstring(name);
  if (nsName === 0n) return null;
  const fn = msgSend_3_id!(lib, sel("newFunctionWithName:"), nsName);
  objcRelease(nsName);
  if (fn === 0n) return null;
  const pipe = msgSend_4_id_ptr!(device, sel("newComputePipelineStateWithFunction:error:"), fn, null);
  if (pipe === 0n) {
    objcRelease(fn);
    return null;
  }
  let maxTg = 1024;
  try {
    const t = msgSend_2!(pipe, sel("maxTotalThreadsPerThreadgroup"));
    if (t !== 0n) maxTg = Number(t);
  } catch {}
  return { fn, pipe, maxTg };
}

// ─── Affine detector (mirrors cuda.ts / simd.ts) ───────────────────────────
// Four-point probe (x=-1,0,1,2) catches piecewise functions like relu.

const AFFINE_TOL = 1e-5;

function tryAffineKernel(fn: (x: number) => number): { k1: number; k0: number } | null {
  try {
    const yn1 = fn(-1);
    const y0 = fn(0);
    const y1 = fn(1);
    const y2 = fn(2);
    if (!Number.isFinite(yn1) || !Number.isFinite(y0) || !Number.isFinite(y1) || !Number.isFinite(y2)) return null;
    const k1 = y1 - y0;
    const k0 = y0;
    if (Math.abs(y2 - (2 * k1 + k0)) > AFFINE_TOL * (1 + Math.abs(y2))) return null;
    if (Math.abs(yn1 - (-k1 + k0)) > AFFINE_TOL * (1 + Math.abs(yn1))) return null;
    return { k1, k0 };
  } catch {
    return null;
  }
}

// MTLResourceOptions flags. StorageModeShared (0) makes the buffer CPU- and
// GPU-accessible on Apple Silicon with zero-copy — no explicit synchronize
// needed for the sizes we're working with. (Old AMD Macs would prefer
// Managed, but this backend's primary target is Apple Silicon.)
const MTL_STORAGE_MODE_SHARED = 0;

// ─── Kernel launch: simdMapAffineF32 ───────────────────────────────────────

function launchAffineF32(a: Float32Array, k1: number, k0: number): Float32Array {
  const n = a.length;
  const bytes = BigInt(n * 4);

  // newBufferWithBytes:length:options: — copies `a` into GPU-visible memory.
  const inBuf = msgSend_5_ptr_u64_u64_ret!(
    device,
    sel("newBufferWithBytes:length:options:"),
    ffiPtr!(a),
    bytes,
    BigInt(MTL_STORAGE_MODE_SHARED),
  );
  if (inBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithBytes failed");

  let outBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    outBuf = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), bytes, BigInt(MTL_STORAGE_MODE_SHARED));
    if (outBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithLength failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    if (cmdBuf === 0n) throw new Error("parabun:gpu metal: commandBuffer failed");

    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    if (encoder === 0n) throw new Error("parabun:gpu metal: computeCommandEncoder failed");

    // setComputePipelineState:
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), simdMapPipeline);
    // setBuffer:offset:atIndex: for in=0, out=1
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), inBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), outBuf, 0n, 1n);
    // setBytes:length:atIndex: for n, k1, k0 at buffer indices 2/3/4
    const pN = new Uint32Array([n]);
    const pK1 = new Float32Array([k1]);
    const pK0 = new Float32Array([k0]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pN), 4n, 2n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pK1), 4n, 3n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pK0), 4n, 4n);

    // dispatchThreads:threadsPerThreadgroup: takes two MTLSize (3× u64)
    // structs by value. On arm64, aggregates >16 bytes are passed via
    // indirect reference — we hand over the address of our packed
    // BigUint64Array and the ABI treats that as the by-value struct.
    const tgSize = Math.min(simdMapMaxTg, 256);
    const grid = new BigUint64Array([BigInt(n), 1n, 1n]);
    const threads = new BigUint64Array([BigInt(tgSize), 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreads:threadsPerThreadgroup:"), ffiPtr!(grid), ffiPtr!(threads));

    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    // Copy out: [outBuf contents] → void*, then read n*4 bytes.
    const contents = msgSend_2!(outBuf, sel("contents"));
    if (contents === 0n) throw new Error("parabun:gpu metal: outBuf contents is null");
    const out = new Float32Array(n);
    const view = new Float32Array(ffiToArrayBuffer!(Number(contents), 0, n * 4));
    out.set(view);
    return out;
  } finally {
    // encoder is auto-released on endEncoding; command buffer is
    // auto-released by the queue when complete. Buffers we created with
    // `new…` need explicit release.
    objcRelease(inBuf);
    if (outBuf !== 0n) objcRelease(outBuf);
  }
}

// ─── Buffer staging ────────────────────────────────────────────────────────
// newBufferFromF32 picks newBufferWithBytesNoCopy: when the caller's typed
// array is page-aligned (macOS only requires pointer alignment; length is
// unconstrained), else falls back to newBufferWithBytes: which copies into
// an MTLBuffer-owned region.
//
// For large matrices the internal memcpy is the single biggest item in
// matVec latency — see bench/parabun-metal-zerocopy for measurements on M4
// showing the copy path is ~5× slower than nocopy at 64 MiB.

function isPageAlignedAddr(addr: number): boolean {
  if (pageSize <= 0) return false;
  return (addr & (pageSize - 1)) === 0;
}

function newBufferFromF32(arr: Float32Array, byteLen: bigint): bigint {
  const addr = ffiPtr!(arr);
  if (isPageAlignedAddr(addr)) {
    return msgSend_6_u64x4!(
      device,
      sel("newBufferWithBytesNoCopy:length:options:deallocator:"),
      BigInt(addr),
      byteLen,
      BigInt(MTL_STORAGE_MODE_SHARED),
      0n,
    );
  }
  return msgSend_5_ptr_u64_u64_ret!(
    device,
    sel("newBufferWithBytes:length:options:"),
    addr,
    byteLen,
    BigInt(MTL_STORAGE_MODE_SHARED),
  );
}

// ─── Page-aligned alloc ────────────────────────────────────────────────────
// Returns a Float32Array / Float64Array whose backing pointer is a multiple
// of the system page size (16 KiB on Apple Silicon, 4 KiB on Intel). Memory
// is owned by posix_memalign and never freed — allocations persist for the
// backend's lifetime, matching para:simd.alloc's commit-for-lifetime model.
// The intent is that callers stage hot inputs through alloc() so matVec can
// take the NOCOPY path; freeing would require a FinalizationRegistry + care
// around Metal's aliased MTLBuffer lifetimes, which is out of scope here.

function alloc(length: number, type: "f32" | "f64", _opts?: { pinned?: boolean }): FArray {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError(`length must be a non-negative integer; got ${length}`);
  }
  if (type !== "f32" && type !== "f64") {
    throw new TypeError(`type must be "f32" or "f64"; got ${String(type)}`);
  }
  // `pinned: true` on Metal is subsumed by page-aligned unified memory (the
  // NOCOPY dispatch path alloc already takes). Accept the flag for API
  // uniformity with CUDA; no behavior difference.
  if (!probe()) throw new Error("parabun:gpu metal: backend unavailable");
  const elemBytes = type === "f32" ? 4 : 8;
  const byteLen = length * elemBytes;
  if (byteLen === 0) return type === "f32" ? new Float32Array(0) : new Float64Array(0);
  const outPtr = new BigUint64Array(1);
  const rc = libc!.symbols.posix_memalign(ffiPtr!(outPtr), BigInt(pageSize), BigInt(byteLen));
  if (rc !== 0) throw new Error(`parabun:gpu metal: posix_memalign failed (rc=${rc})`);
  const addr = Number(outPtr[0]);
  const ab = ffiToArrayBuffer!(addr, 0, byteLen);
  return type === "f32" ? new Float32Array(ab) : new Float64Array(ab);
}

function isAligned(arr: FArray): boolean {
  if (!(arr instanceof Float32Array) && !(arr instanceof Float64Array)) return false;
  if (!probe()) return false;
  return isPageAlignedAddr(ffiPtr!(arr));
}

// ─── hold / releaseHandle ──────────────────────────────────────────────────
// `hold(arr)` creates one MTLBuffer pointing at the array's memory (NOCOPY
// if the array is page-aligned, COPY into an MTLBuffer-owned region if not)
// and returns a handle the caller passes back into matVec. The handle's
// MTLBuffer is reused across dispatches — the bench/parabun-metal-zerocopy
// RESIDENT row (30-150% faster than NOCOPY) is what this API exposes.
//
// Only Float32Array is wired through the MTLBuffer today because matVec on
// f64 still forwards to para:simd. f64 handles allocate no buffer and just
// wrap the view, so `release` is a no-op; matVec sees `view` and falls
// through to simd.
//
// The handle holds a reference to `view` so the backing pointer stays live
// as long as the handle does — critical for NOCOPY where Metal reads
// directly from the user's memory.

function hold(arr: FArray): GpuHandle {
  if (!(arr instanceof Float32Array) && !(arr instanceof Float64Array)) {
    throw new TypeError(
      `hold requires Float32Array or Float64Array; got ${(arr as any)?.constructor?.name ?? typeof arr}`,
    );
  }
  if (!probe()) throw new Error("parabun:gpu metal: backend unavailable");
  const type: "f32" | "f64" = arr instanceof Float32Array ? "f32" : "f64";
  let buffer: bigint = 0n;
  if (arr instanceof Float32Array && arr.byteLength > 0) {
    buffer = newBufferFromF32(arr, BigInt(arr.byteLength));
    if (buffer === 0n) throw new Error("parabun:gpu metal: newBuffer failed in hold");
  }
  return {
    __bunGpuHandle: true,
    backend: "metal",
    type,
    length: arr.length,
    buffer,
    view: arr,
    released: false,
  };
}

function releaseHandle(handle: GpuHandle): void {
  if (!isGpuHandle(handle)) {
    throw new TypeError(`release expected a GpuHandle; got ${typeof handle}`);
  }
  if (handle.released) return;
  if (handle.buffer !== 0n) {
    objcRelease(handle.buffer);
    handle.buffer = 0n;
  }
  handle.released = true;
}

// Metal's `alloc` returns page-aligned memory owned by posix_memalign; we
// deliberately leak that memory today because MTLBuffer NOCOPY aliases it.
// Accept `releasePinned` calls as no-ops for API parity with CUDA.
function releasePinned(_arr: FArray): boolean {
  return false;
}

// ─── Kernel launch: matVecF32 ──────────────────────────────────────────────
// M×K matrix · K-vector → M-vector, one thread per row. Same buffer/encoder
// choreography as launchAffineF32, different pipeline + buffer layout.

function launchMatVecF32(mat: Float32Array | GpuHandle, vec: Float32Array, m: number, k: number): Float32Array {
  const matBytes = BigInt(m * k * 4);
  const vecBytes = BigInt(k * 4);
  const outBytes = BigInt(m * 4);

  // If the caller passed a GpuHandle, reuse its MTLBuffer (Tier 4 residency).
  // Otherwise, stage the typed array: page-aligned inputs take NOCOPY,
  // everything else falls back to newBufferWithBytes: (one memcpy per call).
  // See bench/parabun-metal-zerocopy/README.md — RESIDENT is 30-150% faster
  // than NOCOPY and 2-10× faster than COPY at >= 4 MiB.
  let matBuf: bigint;
  let matBufOwned: boolean;
  if (isGpuHandle(mat)) {
    if (mat.released) throw new Error("parabun:gpu: matVec called on released handle");
    if (mat.buffer === 0n) throw new Error("parabun:gpu metal: handle has no MTLBuffer (f64?)");
    matBuf = mat.buffer;
    matBufOwned = false;
  } else {
    matBuf = newBufferFromF32(mat, matBytes);
    if (matBuf === 0n) throw new Error("parabun:gpu metal: newBuffer (mat) failed");
    matBufOwned = true;
  }

  let vecBuf: bigint = 0n;
  let outBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    vecBuf = newBufferFromF32(vec, vecBytes);
    if (vecBuf === 0n) throw new Error("parabun:gpu metal: newBuffer (vec) failed");

    outBuf = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), outBytes, BigInt(MTL_STORAGE_MODE_SHARED));
    if (outBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithLength (out) failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    if (cmdBuf === 0n) throw new Error("parabun:gpu metal: commandBuffer failed");

    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    if (encoder === 0n) throw new Error("parabun:gpu metal: computeCommandEncoder failed");

    msgSend_3_id!(encoder, sel("setComputePipelineState:"), matVecPipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), matBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), vecBuf, 0n, 1n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), outBuf, 0n, 2n);
    const pM = new Uint32Array([m]);
    const pK = new Uint32Array([k]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pM), 4n, 3n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pK), 4n, 4n);

    // Launch M threadgroups of 32 threads each. Each threadgroup is one
    // simdgroup on Apple Silicon (simdgroup width = 32), so the kernel's
    // `simd_sum` tree-reduces within a single TG without needing a
    // threadgroup barrier. dispatchThreadgroups (not dispatchThreads) so
    // the TG count is M exactly — no partial trailing TG, no edge cases.
    const tgCount = new BigUint64Array([BigInt(m), 1n, 1n]);
    const threadsPerTg = new BigUint64Array([32n, 1n, 1n]);
    msgSend_4_ptr_ptr!(
      encoder,
      sel("dispatchThreadgroups:threadsPerThreadgroup:"),
      ffiPtr!(tgCount),
      ffiPtr!(threadsPerTg),
    );

    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const contents = msgSend_2!(outBuf, sel("contents"));
    if (contents === 0n) throw new Error("parabun:gpu metal: outBuf contents is null");
    const out = new Float32Array(m);
    const view = new Float32Array(ffiToArrayBuffer!(Number(contents), 0, m * 4));
    out.set(view);
    return out;
  } finally {
    if (matBufOwned) objcRelease(matBuf);
    if (vecBuf !== 0n) objcRelease(vecBuf);
    if (outBuf !== 0n) objcRelease(outBuf);
  }
}

// ─── Kernel launch: matmulF32 ──────────────────────────────────────────────
// C = A·B where A is M×K, B is K×N, C is M×N, all row-major f32.
// Same buffer/encoder choreography as launchMatVecF32; different pipeline,
// different grid. Grid covers ceil(N/32) × ceil(M/32); threadgroup is
// 32×32 = 1024 threads (Apple GPU max per TG).

function launchMatmulF32(
  a: Float32Array | GpuHandle,
  b: Float32Array | GpuHandle,
  m: number,
  k: number,
  n: number,
  out?: Float32Array,
): Float32Array {
  const aBytes = BigInt(m * k * 4);
  const bBytes = BigInt(k * n * 4);
  const cBytes = BigInt(m * n * 4);

  let aBuf: bigint;
  let aBufOwned: boolean;
  if (isGpuHandle(a)) {
    if (a.released) throw new Error("parabun:gpu: matmul called on released handle");
    if (a.buffer === 0n) throw new Error("parabun:gpu metal: handle has no MTLBuffer (f64?)");
    aBuf = a.buffer;
    aBufOwned = false;
  } else {
    aBuf = newBufferFromF32(a, aBytes);
    if (aBuf === 0n) throw new Error("parabun:gpu metal: newBuffer (A) failed");
    aBufOwned = true;
  }

  let bBuf: bigint;
  let bBufOwned: boolean;
  if (isGpuHandle(b)) {
    if (b.released) throw new Error("parabun:gpu: matmul called on released handle");
    if (b.buffer === 0n) throw new Error("parabun:gpu metal: handle has no MTLBuffer (f64?)");
    bBuf = b.buffer;
    bBufOwned = false;
  } else {
    bBuf = newBufferFromF32(b, bBytes);
    if (bBuf === 0n) {
      if (aBufOwned) objcRelease(aBuf);
      throw new Error("parabun:gpu metal: newBuffer (B) failed");
    }
    bBufOwned = true;
  }

  let outBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    outBuf = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), cBytes, BigInt(MTL_STORAGE_MODE_SHARED));
    if (outBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithLength (C) failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    if (cmdBuf === 0n) throw new Error("parabun:gpu metal: commandBuffer failed");

    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    if (encoder === 0n) throw new Error("parabun:gpu metal: computeCommandEncoder failed");

    msgSend_3_id!(encoder, sel("setComputePipelineState:"), matmulPipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), aBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), bBuf, 0n, 1n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), outBuf, 0n, 2n);
    const pM = new Uint32Array([m]);
    const pK = new Uint32Array([k]);
    const pN = new Uint32Array([n]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pM), 4n, 3n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pK), 4n, 4n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pN), 4n, 5n);

    const OUT_TILE = 32;
    const tgX = BigInt(Math.floor((n + OUT_TILE - 1) / OUT_TILE));
    const tgY = BigInt(Math.floor((m + OUT_TILE - 1) / OUT_TILE));
    const tgCount = new BigUint64Array([tgX, tgY, 1n]);
    const threadsPerTg = new BigUint64Array([32n, 32n, 1n]);
    msgSend_4_ptr_ptr!(
      encoder,
      sel("dispatchThreadgroups:threadsPerThreadgroup:"),
      ffiPtr!(tgCount),
      ffiPtr!(threadsPerTg),
    );

    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const contents = msgSend_2!(outBuf, sel("contents"));
    if (contents === 0n) throw new Error("parabun:gpu metal: outBuf contents is null");
    const view = new Float32Array(ffiToArrayBuffer!(Number(contents), 0, m * n * 4));
    // Copy into caller-provided buffer when present (including SAB-backed).
    // Metal shared-storage buffers can't alias a JS SharedArrayBuffer, so we
    // still pay one memcpy — but it's GPU→shared-storage host pointer, not
    // the JS-side Float32Array.prototype.set that was killing parallel top-K.
    const dst = out ?? new Float32Array(m * n);
    dst.set(view);
    return dst;
  } finally {
    if (aBufOwned) objcRelease(aBuf);
    if (bBufOwned) objcRelease(bBuf);
    if (outBuf !== 0n) objcRelease(outBuf);
  }
}

// ─── Kernel launch: conv2D ─────────────────────────────────────────────────
// Valid-mode 2D convolution. Output dims are (iH-kH+1) × (iW-kW+1). Same
// buffer/encoder choreography as launchMatmulF32; pipeline is conv2d_f32,
// dispatch is one thread per output pixel in 16×16 threadgroups.

function launchConv2D(
  input: Float32Array | GpuHandle,
  kernel: Float32Array | GpuHandle,
  iW: number,
  iH: number,
  kW: number,
  kH: number,
): Float32Array {
  const oW = iW - kW + 1;
  const oH = iH - kH + 1;
  const inBytes = BigInt(iW * iH * 4);
  const kBytes = BigInt(kW * kH * 4);
  const outBytes = BigInt(oW * oH * 4);

  let inBuf: bigint;
  let inBufOwned: boolean;
  if (isGpuHandle(input)) {
    if (input.released) throw new Error("parabun:gpu: conv2D called on released handle");
    if (input.buffer === 0n) throw new Error("parabun:gpu metal: handle has no MTLBuffer (f64?)");
    inBuf = input.buffer;
    inBufOwned = false;
  } else {
    inBuf = newBufferFromF32(input, inBytes);
    if (inBuf === 0n) throw new Error("parabun:gpu metal: newBuffer (input) failed");
    inBufOwned = true;
  }

  let kBuf: bigint;
  let kBufOwned: boolean;
  if (isGpuHandle(kernel)) {
    if (kernel.released) throw new Error("parabun:gpu: conv2D called on released handle");
    if (kernel.buffer === 0n) throw new Error("parabun:gpu metal: kernel handle has no MTLBuffer");
    kBuf = kernel.buffer;
    kBufOwned = false;
  } else {
    kBuf = newBufferFromF32(kernel, kBytes);
    if (kBuf === 0n) {
      if (inBufOwned) objcRelease(inBuf);
      throw new Error("parabun:gpu metal: newBuffer (kernel) failed");
    }
    kBufOwned = true;
  }

  let outBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    outBuf = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), outBytes, BigInt(MTL_STORAGE_MODE_SHARED));
    if (outBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithLength (output) failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    if (cmdBuf === 0n) throw new Error("parabun:gpu metal: commandBuffer failed");

    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    if (encoder === 0n) throw new Error("parabun:gpu metal: computeCommandEncoder failed");

    msgSend_3_id!(encoder, sel("setComputePipelineState:"), conv2DPipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), inBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), kBuf, 0n, 1n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), outBuf, 0n, 2n);
    const pIW = new Uint32Array([iW]);
    const pIH = new Uint32Array([iH]);
    const pKW = new Uint32Array([kW]);
    const pKH = new Uint32Array([kH]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pIW), 4n, 3n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pIH), 4n, 4n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pKW), 4n, 5n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pKH), 4n, 6n);

    // 16×16 threadgroups → 256 threads/TG. dispatchThreads handles the
    // partial trailing TG when oW/oH aren't multiples of 16; the in-kernel
    // boundary check (`if x >= oW || y >= oH return`) is still needed
    // because dispatchThreads launches whole TGs.
    const threads = new BigUint64Array([BigInt(oW), BigInt(oH), 1n]);
    const tpt = new BigUint64Array([16n, 16n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreads:threadsPerThreadgroup:"), ffiPtr!(threads), ffiPtr!(tpt));

    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const contents = msgSend_2!(outBuf, sel("contents"));
    if (contents === 0n) throw new Error("parabun:gpu metal: outBuf contents is null");
    const out = new Float32Array(oW * oH);
    const view = new Float32Array(ffiToArrayBuffer!(Number(contents), 0, oW * oH * 4));
    out.set(view);
    return out;
  } finally {
    if (inBufOwned) objcRelease(inBuf);
    if (kBufOwned) objcRelease(kBuf);
    if (outBuf !== 0n) objcRelease(outBuf);
  }
}

// ─── Kernel launch: gaussian_blur_rgba_u8 ─────────────────────────────────
// Single-launch fused RGBA blur — mirrors the CUDA path. Input + output
// are Uint8Array of identical byte length; the kernel writes one
// uint8 RGBA quad per output thread.
//
// Caller must ensure the kernel compiled (gaussianBlurRGBAu8Pipeline !== 0n);
// the public wrapper falls back to the CPU path otherwise.

function launchGaussianBlurRGBAu8(input: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const bytes = BigInt(input.length);
  const kSize = 2 * radius + 1;
  const kBytes = BigInt(kSize * 4);

  // Build the 1D Gaussian once on the host. Same coefficients as the C++
  // path so callers see consistent output across CPU and GPU.
  const sigma = radius / 3 + 1e-6;
  const k1d = new Float32Array(kSize);
  let sum = 0;
  for (let i = 0; i < kSize; i++) {
    const x = i - radius;
    k1d[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += k1d[i];
  }
  for (let i = 0; i < kSize; i++) k1d[i] /= sum;

  let inBuf: bigint = 0n;
  let outBuf: bigint = 0n;
  let kBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    // newBufferWithBytes copies into MTLBuffer-owned region (always
    // available, no alignment requirement). For sustained-image
    // pipelines callers can hold a residency wrapper later; for v1
    // every dispatch allocates fresh.
    inBuf = msgSend_5_ptr_u64_u64_ret!(
      device,
      sel("newBufferWithBytes:length:options:"),
      ffiPtr!(input),
      bytes,
      BigInt(MTL_STORAGE_MODE_SHARED),
    );
    if (inBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithBytes (input) failed");

    outBuf = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), bytes, BigInt(MTL_STORAGE_MODE_SHARED));
    if (outBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithLength (output) failed");

    kBuf = msgSend_5_ptr_u64_u64_ret!(
      device,
      sel("newBufferWithBytes:length:options:"),
      ffiPtr!(k1d),
      kBytes,
      BigInt(MTL_STORAGE_MODE_SHARED),
    );
    if (kBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithBytes (kern) failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    if (cmdBuf === 0n) throw new Error("parabun:gpu metal: commandBuffer failed");

    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    if (encoder === 0n) throw new Error("parabun:gpu metal: computeCommandEncoder failed");

    msgSend_3_id!(encoder, sel("setComputePipelineState:"), gaussianBlurRGBAu8Pipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), inBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), outBuf, 0n, 1n);
    const pW = new Uint32Array([w]);
    const pH = new Uint32Array([h]);
    const pR = new Int32Array([radius]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pW), 4n, 2n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pH), 4n, 3n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), kBuf, 0n, 4n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pR), 4n, 5n);

    // 16×16 threadgroups — matches the CUDA dispatch shape.
    const threads = new BigUint64Array([BigInt(w), BigInt(h), 1n]);
    const tpt = new BigUint64Array([16n, 16n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreads:threadsPerThreadgroup:"), ffiPtr!(threads), ffiPtr!(tpt));

    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const contents = msgSend_2!(outBuf, sel("contents"));
    if (contents === 0n) throw new Error("parabun:gpu metal: outBuf contents is null");
    const out = new Uint8Array(input.length);
    const view = new Uint8Array(ffiToArrayBuffer!(Number(contents), 0, input.length));
    out.set(view);
    return out;
  } finally {
    if (inBuf !== 0n) objcRelease(inBuf);
    if (outBuf !== 0n) objcRelease(outBuf);
    if (kBuf !== 0n) objcRelease(kBuf);
  }
}

// ─── Size threshold ────────────────────────────────────────────────────────
// Matches cuda.ts — the fixed per-dispatch cost (buffer alloc + pipeline
// binding + GPU/CPU round-trip) makes the CPU path faster under ~256k f32.

const MIN_SIMDMAP_ELEMS = 1 << 18;
// matVec has two separate thresholds on purpose:
//
//   - MIN_MATVEC_DISPATCH_ELEMS: above this, `matVec` runs on the MSL kernel
//     when the caller hands us f32 inputs. This exists so tests and
//     benchmarks exercise the real GPU path, not just the simd fallback.
//   - MIN_MATVEC_WINS_ELEMS:     above this, `winsForSize("matVec", ...)`
//     returns true. This is what pipeline-style callers use to decide
//     whether to route the op to parabun:gpu in the first place.
//
// The naive newBufferWithBytes: path was a wash with CPU at all sizes
// because its internal memcpy dominated. The NOCOPY path (bytes-no-copy
// against page-aligned input) flips the balance: at 1 M f32 elems / 4 MiB
// it's ~2× faster than CPU; at 4 M it's ~4×; at 16 M it's ~4× (see
// bench/parabun-metal-zerocopy/README.md). Dispatch threshold and wins
// threshold are collapsed back to one value now that the kernel actually
// wins above it.
//
// Callers that want the wins at or above this size MUST stage inputs
// through gpu.alloc — opportunistic alignment of arbitrary Float32Arrays
// almost never fires (JSC's typed-array backing is aligned to ~16 bytes,
// not page boundaries).
const MIN_MATVEC_DISPATCH_ELEMS = 1 << 20;
const MIN_MATVEC_WINS_ELEMS = 1 << 20;
// Matches cuda.ts: 16M multiply-adds — e.g. 256^3 or 32×384×32k.
// Below this the triple-loop fallback beats the MTLBuffer staging cost.
const MIN_MATMUL_DISPATCH_FLOPS = 1 << 24;

// ─── Q4_K / Q6_K residency + dispatch ─────────────────────────────────────
// Block sizes match ggml: 144 bytes / 256 elements for q4_K, 210 / 256
// for q6_K.
const Q4K_BLOCK_BYTES = 144;
const Q6K_BLOCK_BYTES = 210;

// Allocate an MTLBuffer holding the raw packed super-block bytes and
// return a GpuHandle with `qFormat` set. The `view` stub is a zero-
// length Float32Array so handle-shape code (e.g. gpu.ts's `length`
// probe) stays happy; callers MUST NOT read it.
function holdQBytes(blocks: Uint8Array, nElems: number, blockBytes: number, qFormat: "q4_K" | "q6_K"): GpuHandle {
  if (!(blocks instanceof Uint8Array)) {
    throw new TypeError(
      `hold${qFormat === "q4_K" ? "Q4K" : "Q6K"} requires Uint8Array; got ${(blocks as any)?.constructor?.name ?? typeof blocks}`,
    );
  }
  if (!Number.isInteger(nElems) || nElems <= 0 || (nElems & 255) !== 0) {
    throw new RangeError(
      `hold${qFormat === "q4_K" ? "Q4K" : "Q6K"}: nElems must be a positive multiple of 256; got ${nElems}`,
    );
  }
  const expectedBytes = (nElems / 256) * blockBytes;
  if (blocks.byteLength !== expectedBytes) {
    throw new RangeError(
      `hold${qFormat === "q4_K" ? "Q4K" : "Q6K"}: expected ${expectedBytes} bytes for ${nElems} elements; got ${blocks.byteLength}`,
    );
  }
  if (!probe()) throw new Error("parabun:gpu metal: backend unavailable");
  const kernelReady = qFormat === "q4_K" ? matVecQ4KPipeline !== 0n : matVecQ6KPipeline !== 0n;
  if (!kernelReady) {
    throw new Error(`parabun:gpu metal: ${qFormat} kernel failed to compile at probe time`);
  }

  // Copy the packed bytes into an MTLBuffer. We cannot NOCOPY this as
  // we do for Float32Array because the source is a Uint8Array and we
  // can't guarantee page alignment; a one-time memcpy at hold time is
  // negligible next to the persistent residency win.
  const bytes = BigInt(blocks.byteLength);
  const buf = msgSend_5_ptr_u64_u64_ret!(
    device,
    sel("newBufferWithBytes:length:options:"),
    ffiPtr!(blocks),
    bytes,
    BigInt(MTL_STORAGE_MODE_SHARED),
  );
  if (buf === 0n) throw new Error(`parabun:gpu metal: newBufferWithBytes failed for ${qFormat}`);

  return {
    __bunGpuHandle: true,
    backend: "metal",
    type: "f32",
    length: nElems,
    buffer: buf,
    view: new Float32Array(0),
    released: false,
    qFormat,
  };
}

function holdQ4K(blocks: Uint8Array, nElems: number): GpuHandle {
  return holdQBytes(blocks, nElems, Q4K_BLOCK_BYTES, "q4_K");
}

function holdQ6K(blocks: Uint8Array, nElems: number): GpuHandle {
  return holdQBytes(blocks, nElems, Q6K_BLOCK_BYTES, "q6_K");
}

// Dispatch a quantized matVec. Shared encoder choreography between q4_K
// and q6_K — same buffer layout, different pipeline. `k` must be a
// multiple of 256 (caller asserts this indirectly via hold(), which
// rejects non-256-aligned tensors). Grid: ⌈m/4⌉ threadgroups × 128
// threads/TG = 4 rows/TG, each row owned by one simdgroup.
function launchMatVecQ(
  mat: GpuHandle,
  vec: Float32Array,
  m: number,
  k: number,
  pipeline: bigint,
  qFormat: "q4_K" | "q6_K",
): Float32Array {
  if (mat.buffer === 0n) throw new Error(`parabun:gpu metal: ${qFormat} handle has no MTLBuffer`);
  if ((k & 255) !== 0) {
    throw new RangeError(`parabun:gpu metal: ${qFormat} matVec requires k % 256 == 0; got k=${k}`);
  }
  const kSblocks = k >>> 8;
  const vecBytes = BigInt(k * 4);
  const outBytes = BigInt(m * 4);

  let vecBuf: bigint = 0n;
  let outBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    vecBuf = newBufferFromF32(vec, vecBytes);
    if (vecBuf === 0n) throw new Error("parabun:gpu metal: newBuffer (vec) failed");

    outBuf = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), outBytes, BigInt(MTL_STORAGE_MODE_SHARED));
    if (outBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithLength (out) failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    if (cmdBuf === 0n) throw new Error("parabun:gpu metal: commandBuffer failed");

    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    if (encoder === 0n) throw new Error("parabun:gpu metal: computeCommandEncoder failed");

    msgSend_3_id!(encoder, sel("setComputePipelineState:"), pipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), mat.buffer, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), vecBuf, 0n, 1n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), outBuf, 0n, 2n);
    const pM = new Uint32Array([m]);
    const pKSb = new Uint32Array([kSblocks]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pM), 4n, 3n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pKSb), 4n, 4n);

    // ⌈m/4⌉ threadgroups × 128 threads each = 4 rows per TG. Each row
    // is one simdgroup (32 threads); simd_sum does the cross-lane
    // reduction inside the kernel.
    const tgCount = new BigUint64Array([BigInt((m + 3) >>> 2), 1n, 1n]);
    const threadsPerTg = new BigUint64Array([128n, 1n, 1n]);
    msgSend_4_ptr_ptr!(
      encoder,
      sel("dispatchThreadgroups:threadsPerThreadgroup:"),
      ffiPtr!(tgCount),
      ffiPtr!(threadsPerTg),
    );

    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const contents = msgSend_2!(outBuf, sel("contents"));
    if (contents === 0n) throw new Error("parabun:gpu metal: outBuf contents is null");
    const out = new Float32Array(m);
    const view = new Float32Array(ffiToArrayBuffer!(Number(contents), 0, m * 4));
    out.set(view);
    return out;
  } finally {
    if (vecBuf !== 0n) objcRelease(vecBuf);
    if (outBuf !== 0n) objcRelease(outBuf);
  }
}

function launchMatVecQ4K(mat: GpuHandle, vec: Float32Array, m: number, k: number): Float32Array {
  return launchMatVecQ(mat, vec, m, k, matVecQ4KPipeline, "q4_K");
}

function launchMatVecQ6K(mat: GpuHandle, vec: Float32Array, m: number, k: number): Float32Array {
  return launchMatVecQ(mat, vec, m, k, matVecQ6KPipeline, "q6_K");
}

// ─── GpuScratch: device-only buffer ─────────────────────────────────────
// Mirror of the cuda.ts GpuScratch — a pure MTLBuffer with no host view,
// used by parabun:llm as residency for the KV cache, residual stream, and
// all intermediate activations. Separate from GpuHandle because
// GpuScratch has no user-supplied typed array backing.

type GpuScratch = {
  __bunGpuScratch: true;
  backend: "metal";
  type: "f32" | "i32";
  length: number;
  buffer: bigint;
  released: boolean;
  // Slices share the underlying MTLBuffer with an offset. freeScratch
  // on a slice just marks it released — the parent owns the actual
  // Metal allocation.
  isSlice?: boolean;
  sliceOffsetBytes?: bigint;
};

function isGpuScratch(x: unknown): x is GpuScratch {
  return typeof x === "object" && x !== null && (x as any).__bunGpuScratch === true;
}

function allocScratch(length: number, type: "f32" | "i32" = "f32"): GpuScratch {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError(`length must be a non-negative integer; got ${length}`);
  }
  if (!probe()) throw new Error("parabun:gpu metal: backend unavailable");
  const bytes = BigInt(length * 4);
  let buffer: bigint = 0n;
  if (length > 0) {
    buffer = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), bytes, BigInt(MTL_STORAGE_MODE_SHARED));
    if (buffer === 0n) throw new Error("parabun:gpu metal: newBufferWithLength(scratch) failed");
  }
  return {
    __bunGpuScratch: true,
    backend: "metal",
    type,
    length,
    buffer,
    released: false,
  };
}

function scratchSlice(s: GpuScratch, elemOffset: number, length: number): GpuScratch {
  if (s.released) throw new Error("parabun:gpu metal: slice on released scratch");
  if (elemOffset < 0 || length < 0 || elemOffset + length > s.length) {
    throw new RangeError(`slice out of bounds: offset=${elemOffset}, length=${length}, total=${s.length}`);
  }
  const parentOffset = s.sliceOffsetBytes ?? 0n;
  return {
    __bunGpuScratch: true,
    backend: "metal",
    type: s.type,
    length,
    buffer: s.buffer, // shares MTLBuffer with parent
    released: false,
    isSlice: true,
    sliceOffsetBytes: parentOffset + BigInt(elemOffset * 4),
  };
}

function freeScratch(s: GpuScratch): void {
  if (!isGpuScratch(s)) throw new TypeError("freeScratch expected a GpuScratch");
  if (s.released) return;
  if (s.isSlice) {
    s.released = true;
    return;
  }
  if (s.buffer !== 0n) objcRelease(s.buffer);
  s.buffer = 0n;
  s.released = true;
}

function uploadScratch(src: Float32Array | Int32Array, s: GpuScratch, dstElemOffset = 0): void {
  if (s.released) throw new Error("parabun:gpu metal: uploadScratch on released");
  if (dstElemOffset + src.length > s.length) {
    throw new RangeError(`uploadScratch: ${dstElemOffset} + ${src.length} > ${s.length}`);
  }
  if (s.buffer === 0n) return;
  const contents = msgSend_2!(s.buffer, sel("contents"));
  if (contents === 0n) throw new Error("parabun:gpu metal: scratch contents null");
  const baseOffset = Number(s.sliceOffsetBytes ?? 0n);
  const dstBytes = baseOffset + dstElemOffset * 4;
  const view =
    src instanceof Float32Array
      ? new Float32Array(ffiToArrayBuffer!(Number(contents) + dstBytes, 0, src.length * 4))
      : new Int32Array(ffiToArrayBuffer!(Number(contents) + dstBytes, 0, src.length * 4));
  view.set(src as any);
}

function downloadScratch(s: GpuScratch, dst: Float32Array | Int32Array, srcElemOffset = 0): void {
  if (s.released) throw new Error("parabun:gpu metal: downloadScratch on released");
  if (srcElemOffset + dst.length > s.length) {
    throw new RangeError(`downloadScratch: ${srcElemOffset} + ${dst.length} > ${s.length}`);
  }
  if (s.buffer === 0n) return;
  const contents = msgSend_2!(s.buffer, sel("contents"));
  if (contents === 0n) throw new Error("parabun:gpu metal: scratch contents null");
  const baseOffset = Number(s.sliceOffsetBytes ?? 0n);
  const srcBytes = baseOffset + srcElemOffset * 4;
  const view =
    dst instanceof Float32Array
      ? new Float32Array(ffiToArrayBuffer!(Number(contents) + srcBytes, 0, dst.length * 4))
      : new Int32Array(ffiToArrayBuffer!(Number(contents) + srcBytes, 0, dst.length * 4));
  dst.set(view as any);
}

// ─── devOps kernel launchers ────────────────────────────────────────────
// Unified encoder/dispatch for the 1-thread-per-element kernels. Each
// takes 2 GpuScratch args (for kernels of that shape) plus an optional
// uint constant. Commits + waits synchronously — same shape as
// launchMatVecQ so parabun:llm's call sites block until the kernel finishes.
function encodeWith(fn: (encoder: bigint, cmdBuf: bigint) => void): void {
  const cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
  if (cmdBuf === 0n) throw new Error("parabun:gpu metal: commandBuffer failed");
  const encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
  if (encoder === 0n) throw new Error("parabun:gpu metal: computeCommandEncoder failed");
  try {
    fn(encoder, cmdBuf);
    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));
  } catch (e) {
    msgSend_2!(encoder, sel("endEncoding"));
    throw e;
  }
}

function scratchBufferAndOffset(s: GpuScratch): { buf: bigint; offset: bigint } {
  if (s.released) throw new Error("parabun:gpu metal: op on released scratch");
  return { buf: s.buffer, offset: s.sliceOffsetBytes ?? 0n };
}

// Extract (MTLBuffer, offset) from either a scratch or a user handle. For
// handles, offset is always 0; scratches may carry a slice offset.
function bufferAndOffsetFor(h: GpuHandle | GpuScratch): { buf: bigint; offset: bigint } {
  if ((h as any).__bunGpuHandle === true) {
    const handle = h as GpuHandle;
    if (handle.released) throw new Error("parabun:gpu metal: op on released handle");
    if (handle.buffer === 0n) throw new Error("parabun:gpu metal: handle has no MTLBuffer");
    return { buf: handle.buffer, offset: 0n };
  }
  return scratchBufferAndOffset(h as GpuScratch);
}

// embed_lookup: x[0..dModel) <- embd[tokenId * dModel + 0..dModel).
// Accepts either a GpuScratch (f32 table) or a GpuHandle (f32 or
// quantized table — the latter dispatches to embed_lookup_q{4,6}k_f32).
function launchEmbedLookup(embd: GpuScratch | GpuHandle, x: GpuScratch, tokenId: number, dModel: number): void {
  const { buf: xBuf, offset: xOff } = scratchBufferAndOffset(x);

  const isHandle = (embd as any).__bunGpuHandle === true;
  const qFormat = isHandle ? (embd as GpuHandle).qFormat : undefined;

  if (qFormat === "q4_K" || qFormat === "q6_K") {
    if ((dModel & 0xff) !== 0) throw new Error("parabun:gpu metal: quantized embedLookup requires dModel % 256 == 0");
    const pipeSlot = qFormat === "q4_K" ? devOpsPipes.embedLookupQ4K : devOpsPipes.embedLookupQ6K;
    if (!pipeSlot) throw new Error(`parabun:gpu metal: ${qFormat} embedLookup kernel missing`);
    const { buf: eBuf, offset: eOff } = bufferAndOffsetFor(embd);
    encodeWith(encoder => {
      msgSend_3_id!(encoder, sel("setComputePipelineState:"), pipeSlot.pipe);
      msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), eBuf, eOff, 0n);
      msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), xBuf, xOff, 1n);
      const pTok = new Uint32Array([tokenId]);
      const pD = new Uint32Array([dModel]);
      msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pTok), 4n, 2n);
      msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pD), 4n, 3n);
      const tgCount = new BigUint64Array([1n, 1n, 1n]);
      const threadsPerTg = new BigUint64Array([128n, 1n, 1n]);
      msgSend_4_ptr_ptr!(
        encoder,
        sel("dispatchThreadgroups:threadsPerThreadgroup:"),
        ffiPtr!(tgCount),
        ffiPtr!(threadsPerTg),
      );
    });
    return;
  }

  if (!devOpsPipes.embedLookup) throw new Error("parabun:gpu metal: embedLookup kernel missing");
  const { buf: eBuf, offset: eOff } = bufferAndOffsetFor(embd);
  encodeWith(encoder => {
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), devOpsPipes.embedLookup.pipe);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), eBuf, eOff, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), xBuf, xOff, 1n);
    const pTok = new Uint32Array([tokenId]);
    const pD = new Uint32Array([dModel]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pTok), 4n, 2n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pD), 4n, 3n);
    const threads = new BigUint64Array([BigInt(dModel), 1n, 1n]);
    const tpt = new BigUint64Array([256n, 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreads:threadsPerThreadgroup:"), ffiPtr!(threads), ffiPtr!(tpt));
  });
}

// Shared launch pattern for the elementwise 2-buffer + uint-length
// kernels (accum, biasAdd, siluMul).
function launchElementwise2(pipe: bigint, a: GpuScratch, b: GpuScratch, n: number): void {
  const { buf: aBuf, offset: aOff } = scratchBufferAndOffset(a);
  const { buf: bBuf, offset: bOff } = scratchBufferAndOffset(b);
  encodeWith(encoder => {
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), pipe);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), aBuf, aOff, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), bBuf, bOff, 1n);
    const pN = new Uint32Array([n]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pN), 4n, 2n);
    const threads = new BigUint64Array([BigInt(n), 1n, 1n]);
    const tpt = new BigUint64Array([256n, 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreads:threadsPerThreadgroup:"), ffiPtr!(threads), ffiPtr!(tpt));
  });
}

function launchAccum(x: GpuScratch, d: GpuScratch, n: number): void {
  if (!devOpsPipes.accum) throw new Error("parabun:gpu metal: accum kernel missing");
  launchElementwise2(devOpsPipes.accum.pipe, x, d, n);
}

// biasAdd accepts the bias as either a GpuScratch or a GpuHandle. In
// parabun:llm's forward pass biases are device-resident weights (handles);
// tests pass scratches for convenience.
function launchBiasAdd(x: GpuScratch, b: GpuScratch | GpuHandle, n: number): void {
  if (!devOpsPipes.biasAdd) throw new Error("parabun:gpu metal: biasAdd kernel missing");
  const { buf: xBuf, offset: xOff } = scratchBufferAndOffset(x);
  const { buf: bBuf, offset: bOff } = bufferAndOffsetFor(b);
  encodeWith(encoder => {
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), devOpsPipes.biasAdd.pipe);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), xBuf, xOff, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), bBuf, bOff, 1n);
    const pN = new Uint32Array([n]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pN), 4n, 2n);
    const threads = new BigUint64Array([BigInt(n), 1n, 1n]);
    const tpt = new BigUint64Array([256n, 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreads:threadsPerThreadgroup:"), ffiPtr!(threads), ffiPtr!(tpt));
  });
}

function launchSiluMul(gate: GpuScratch, up: GpuScratch, n: number): void {
  if (!devOpsPipes.siluMul) throw new Error("parabun:gpu metal: siluMul kernel missing");
  launchElementwise2(devOpsPipes.siluMul.pipe, gate, up, n);
}

// y[i] = a[i] + b[i]. 3 buffers.
function launchAdd(a: GpuScratch, b: GpuScratch, y: GpuScratch, n: number): void {
  if (!devOpsPipes.add) throw new Error("parabun:gpu metal: add kernel missing");
  const { buf: aBuf, offset: aOff } = scratchBufferAndOffset(a);
  const { buf: bBuf, offset: bOff } = scratchBufferAndOffset(b);
  const { buf: yBuf, offset: yOff } = scratchBufferAndOffset(y);
  encodeWith(encoder => {
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), devOpsPipes.add.pipe);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), aBuf, aOff, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), bBuf, bOff, 1n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), yBuf, yOff, 2n);
    const pN = new Uint32Array([n]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pN), 4n, 3n);
    const threads = new BigUint64Array([BigInt(n), 1n, 1n]);
    const tpt = new BigUint64Array([256n, 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreads:threadsPerThreadgroup:"), ffiPtr!(threads), ffiPtr!(tpt));
  });
}

// cache[pos * kvRowSize + i] = src[i].
function launchKvStore(src: GpuScratch, cache: GpuScratch, pos: number, kvRowSize: number): void {
  if (!devOpsPipes.kvStore) throw new Error("parabun:gpu metal: kvStore kernel missing");
  const { buf: sBuf, offset: sOff } = scratchBufferAndOffset(src);
  const { buf: cBuf, offset: cOff } = scratchBufferAndOffset(cache);
  encodeWith(encoder => {
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), devOpsPipes.kvStore.pipe);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), sBuf, sOff, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), cBuf, cOff, 1n);
    const pPos = new Uint32Array([pos]);
    const pKv = new Uint32Array([kvRowSize]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pPos), 4n, 2n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pKv), 4n, 3n);
    const threads = new BigUint64Array([BigInt(kvRowSize), 1n, 1n]);
    const tpt = new BigUint64Array([256n, 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreads:threadsPerThreadgroup:"), ffiPtr!(threads), ffiPtr!(tpt));
  });
}

// y[i] = x[i] * rsqrt(mean(x^2) + eps) * w[i]. Single threadgroup of
// 256 threads covers any typical Llama hidden dim strided (n up to
// ~65k is fine; beyond that bump bs via a future re-issued kernel).
function launchRmsnorm(x: GpuScratch, w: GpuScratch | GpuHandle, y: GpuScratch, n: number, eps: number): void {
  if (!devOpsPipes.rmsnorm) throw new Error("parabun:gpu metal: rmsnorm kernel missing");
  const { buf: xBuf, offset: xOff } = scratchBufferAndOffset(x);
  const { buf: wBuf, offset: wOff } = bufferAndOffsetFor(w);
  const { buf: yBuf, offset: yOff } = scratchBufferAndOffset(y);
  encodeWith(encoder => {
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), devOpsPipes.rmsnorm.pipe);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), xBuf, xOff, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), wBuf, wOff, 1n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), yBuf, yOff, 2n);
    const pN = new Uint32Array([n]);
    const pEps = new Float32Array([eps]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pN), 4n, 3n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pEps), 4n, 4n);
    const tgCount = new BigUint64Array([1n, 1n, 1n]);
    const threadsPerTg = new BigUint64Array([256n, 1n, 1n]);
    msgSend_4_ptr_ptr!(
      encoder,
      sel("dispatchThreadgroups:threadsPerThreadgroup:"),
      ffiPtr!(tgCount),
      ffiPtr!(threadsPerTg),
    );
  });
}

// argmax(logits) → outIdx (single int32). 1 threadgroup, 256 threads.
function launchArgmax(logits: GpuScratch, outIdx: GpuScratch, n: number): void {
  if (!devOpsPipes.argmax) throw new Error("parabun:gpu metal: argmax kernel missing");
  if (outIdx.type !== "i32") throw new TypeError("argmax outIdx must be an i32 scratch");
  const { buf: lBuf, offset: lOff } = scratchBufferAndOffset(logits);
  const { buf: oBuf, offset: oOff } = scratchBufferAndOffset(outIdx);
  encodeWith(encoder => {
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), devOpsPipes.argmax.pipe);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), lBuf, lOff, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), oBuf, oOff, 1n);
    const pN = new Uint32Array([n]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pN), 4n, 2n);
    const tgCount = new BigUint64Array([1n, 1n, 1n]);
    const threadsPerTg = new BigUint64Array([256n, 1n, 1n]);
    msgSend_4_ptr_ptr!(
      encoder,
      sel("dispatchThreadgroups:threadsPerThreadgroup:"),
      ffiPtr!(tgCount),
      ffiPtr!(threadsPerTg),
    );
  });
}

// Rotary positional embedding — interleaved-pair (norm) or split-half
// (neox) variants. In-place rotate of each head slot's (x[a], x[b]) pair
// by theta = pos * invFreq[i]. Dispatch: 1 threadgroup per head, half
// headDim threads per threadgroup.
function launchRope(
  x: GpuScratch,
  invFreq: GpuScratch,
  nHeads: number,
  headDim: number,
  pos: number,
  mode: "norm" | "neox",
): void {
  const slot = mode === "neox" ? devOpsPipes.ropeNeox : devOpsPipes.ropeNorm;
  if (!slot) throw new Error(`parabun:gpu metal: rope${mode === "neox" ? "Neox" : "Norm"} kernel missing`);
  const { buf: xBuf, offset: xOff } = scratchBufferAndOffset(x);
  const { buf: fBuf, offset: fOff } = scratchBufferAndOffset(invFreq);
  encodeWith(encoder => {
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), slot.pipe);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), xBuf, xOff, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), fBuf, fOff, 1n);
    const pHd = new Uint32Array([headDim]);
    const pPos = new Uint32Array([pos]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pHd), 4n, 2n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pPos), 4n, 3n);
    const tgCount = new BigUint64Array([BigInt(nHeads), 1n, 1n]);
    const threadsPerTg = new BigUint64Array([BigInt(headDim >> 1), 1n, 1n]);
    msgSend_4_ptr_ptr!(
      encoder,
      sel("dispatchThreadgroups:threadsPerThreadgroup:"),
      ffiPtr!(tgCount),
      ffiPtr!(threadsPerTg),
    );
  });
}

function launchRopeNorm(x: GpuScratch, invFreq: GpuScratch, nHeads: number, headDim: number, pos: number): void {
  launchRope(x, invFreq, nHeads, headDim, pos, "norm");
}
function launchRopeNeox(x: GpuScratch, invFreq: GpuScratch, nHeads: number, headDim: number, pos: number): void {
  launchRope(x, invFreq, nHeads, headDim, pos, "neox");
}

// Unified rope entry matching parabun:llm's devOps signature. mode is
// "norm" (interleaved) or "neox" (split halves).
function launchRopeDispatch(
  x: GpuScratch,
  invFreq: GpuScratch,
  nHeads: number,
  headDim: number,
  pos: number,
  mode: "norm" | "neox",
): void {
  launchRope(x, invFreq, nHeads, headDim, pos, mode);
}

// Attention scores: scores[h*scoreStride + t] = scale * dot(Q[h], K[t][kvh]).
// Dispatch: (nHeads, ctxLen) threadgroups, headDim threads per tg.
function launchAttnScores(
  q: GpuScratch,
  kCache: GpuScratch,
  scores: GpuScratch,
  nHeads: number,
  headDim: number,
  kvRowSize: number,
  groupSize: number,
  scoreStride: number,
  ctxLen: number,
  scale: number,
): void {
  if (!devOpsPipes.attnScores) throw new Error("parabun:gpu metal: attnScores kernel missing");
  const { buf: qBuf, offset: qOff } = scratchBufferAndOffset(q);
  const { buf: kBuf, offset: kOff } = scratchBufferAndOffset(kCache);
  const { buf: sBuf, offset: sOff } = scratchBufferAndOffset(scores);
  encodeWith(encoder => {
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), devOpsPipes.attnScores.pipe);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), qBuf, qOff, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), kBuf, kOff, 1n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), sBuf, sOff, 2n);
    const pHd = new Uint32Array([headDim]);
    const pKv = new Uint32Array([kvRowSize]);
    const pGs = new Uint32Array([groupSize]);
    const pSs = new Uint32Array([scoreStride]);
    const pScale = new Float32Array([scale]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pHd), 4n, 3n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pKv), 4n, 4n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pGs), 4n, 5n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pSs), 4n, 6n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pScale), 4n, 7n);
    const tgCount = new BigUint64Array([BigInt(nHeads), BigInt(ctxLen), 1n]);
    const threadsPerTg = new BigUint64Array([BigInt(headDim), 1n, 1n]);
    msgSend_4_ptr_ptr!(
      encoder,
      sel("dispatchThreadgroups:threadsPerThreadgroup:"),
      ffiPtr!(tgCount),
      ffiPtr!(threadsPerTg),
    );
  });
}

// Row-wise softmax in place. Dispatch: rows tgs, bs threads, where bs is
// next-pow-2 ≥ cols clamped to [32, 1024].
function launchSoftmaxRow(scores: GpuScratch, rows: number, cols: number, stride: number): void {
  if (!devOpsPipes.softmaxRow) throw new Error("parabun:gpu metal: softmaxRow kernel missing");
  const { buf: sBuf, offset: sOff } = scratchBufferAndOffset(scores);
  // bs: next pow-2 ≥ cols, clamped to [32, 1024].
  const target = Math.max(32, Math.min(1024, cols));
  const bs = Math.min(1024, Math.max(32, 1 << Math.ceil(Math.log2(target))));
  encodeWith(encoder => {
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), devOpsPipes.softmaxRow.pipe);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), sBuf, sOff, 0n);
    const pCols = new Uint32Array([cols]);
    const pStride = new Uint32Array([stride]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pCols), 4n, 1n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pStride), 4n, 2n);
    const tgCount = new BigUint64Array([BigInt(rows), 1n, 1n]);
    const threadsPerTg = new BigUint64Array([BigInt(bs), 1n, 1n]);
    msgSend_4_ptr_ptr!(
      encoder,
      sel("dispatchThreadgroups:threadsPerThreadgroup:"),
      ffiPtr!(tgCount),
      ffiPtr!(threadsPerTg),
    );
  });
}

// Device-resident matVec (devOps). Dispatches to the f32x4 path when
// k is a multiple of 4, or to the quantized pipelines when mat has a
// qFormat tag. Writes result into `y` scratch — no host roundtrip.
function launchMatVecDev(mat: GpuHandle, x: GpuScratch, y: GpuScratch, m: number, k: number): void {
  if (mat.released) throw new Error("parabun:gpu metal: matVec called on released handle");
  if (mat.buffer === 0n) throw new Error("parabun:gpu metal: handle has no MTLBuffer");
  const { buf: xBuf, offset: xOff } = scratchBufferAndOffset(x);
  const { buf: yBuf, offset: yOff } = scratchBufferAndOffset(y);

  if (mat.qFormat === "q4_K") {
    if (matVecQ4KPipeline === 0n) throw new Error("parabun:gpu metal: matVecQ4K pipeline missing");
    if ((k & 0xff) !== 0) throw new Error("parabun:gpu metal: q4_K matVec requires k % 256 == 0");
    const kSblocks = k >>> 8;
    encodeWith(encoder => {
      msgSend_3_id!(encoder, sel("setComputePipelineState:"), matVecQ4KPipeline);
      msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), mat.buffer, 0n, 0n);
      msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), xBuf, xOff, 1n);
      msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), yBuf, yOff, 2n);
      const pM = new Uint32Array([m]);
      const pKSb = new Uint32Array([kSblocks]);
      msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pM), 4n, 3n);
      msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pKSb), 4n, 4n);
      const tgCount = new BigUint64Array([BigInt((m + 3) >>> 2), 1n, 1n]);
      const threadsPerTg = new BigUint64Array([128n, 1n, 1n]);
      msgSend_4_ptr_ptr!(
        encoder,
        sel("dispatchThreadgroups:threadsPerThreadgroup:"),
        ffiPtr!(tgCount),
        ffiPtr!(threadsPerTg),
      );
    });
    return;
  }

  if (mat.qFormat === "q6_K") {
    if (matVecQ6KPipeline === 0n) throw new Error("parabun:gpu metal: matVecQ6K pipeline missing");
    if ((k & 0xff) !== 0) throw new Error("parabun:gpu metal: q6_K matVec requires k % 256 == 0");
    const kSblocks = k >>> 8;
    encodeWith(encoder => {
      msgSend_3_id!(encoder, sel("setComputePipelineState:"), matVecQ6KPipeline);
      msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), mat.buffer, 0n, 0n);
      msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), xBuf, xOff, 1n);
      msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), yBuf, yOff, 2n);
      const pM = new Uint32Array([m]);
      const pKSb = new Uint32Array([kSblocks]);
      msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pM), 4n, 3n);
      msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pKSb), 4n, 4n);
      const tgCount = new BigUint64Array([BigInt((m + 3) >>> 2), 1n, 1n]);
      const threadsPerTg = new BigUint64Array([128n, 1n, 1n]);
      msgSend_4_ptr_ptr!(
        encoder,
        sel("dispatchThreadgroups:threadsPerThreadgroup:"),
        ffiPtr!(tgCount),
        ffiPtr!(threadsPerTg),
      );
    });
    return;
  }

  // f32 path. k must be a multiple of 4 for the float4 kernel. The
  // llama/qwen projection dims we target always satisfy this.
  if (!devOpsPipes.matVec) throw new Error("parabun:gpu metal: matVec kernel missing");
  if ((k & 3) !== 0) throw new Error("parabun:gpu metal: devOps matVec requires k % 4 == 0");
  const k_div4 = k >>> 2;
  encodeWith(encoder => {
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), devOpsPipes.matVec.pipe);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), mat.buffer, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), xBuf, xOff, 1n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), yBuf, yOff, 2n);
    const pM = new Uint32Array([m]);
    const pK = new Uint32Array([k_div4]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pM), 4n, 3n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pK), 4n, 4n);
    const tgCount = new BigUint64Array([BigInt(m), 1n, 1n]);
    const threadsPerTg = new BigUint64Array([128n, 1n, 1n]);
    msgSend_4_ptr_ptr!(
      encoder,
      sel("dispatchThreadgroups:threadsPerThreadgroup:"),
      ffiPtr!(tgCount),
      ffiPtr!(threadsPerTg),
    );
  });
}

// out[h*headDim + i] = sum_t scores[h][t] * V[t][kvh][i]
// Dispatch: nHeads tgs, headDim threads.
function launchAttnOutput(
  scores: GpuScratch,
  vCache: GpuScratch,
  out: GpuScratch,
  nHeads: number,
  headDim: number,
  kvRowSize: number,
  groupSize: number,
  ctxLen: number,
  scoreStride: number,
): void {
  if (!devOpsPipes.attnOutput) throw new Error("parabun:gpu metal: attnOutput kernel missing");
  const { buf: sBuf, offset: sOff } = scratchBufferAndOffset(scores);
  const { buf: vBuf, offset: vOff } = scratchBufferAndOffset(vCache);
  const { buf: oBuf, offset: oOff } = scratchBufferAndOffset(out);
  encodeWith(encoder => {
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), devOpsPipes.attnOutput.pipe);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), sBuf, sOff, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), vBuf, vOff, 1n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), oBuf, oOff, 2n);
    const pHd = new Uint32Array([headDim]);
    const pKv = new Uint32Array([kvRowSize]);
    const pGs = new Uint32Array([groupSize]);
    const pCtx = new Uint32Array([ctxLen]);
    const pSs = new Uint32Array([scoreStride]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pHd), 4n, 3n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pKv), 4n, 4n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pGs), 4n, 5n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pCtx), 4n, 6n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pSs), 4n, 7n);
    const tgCount = new BigUint64Array([BigInt(nHeads), 1n, 1n]);
    const threadsPerTg = new BigUint64Array([BigInt(headDim), 1n, 1n]);
    msgSend_4_ptr_ptr!(
      encoder,
      sel("dispatchThreadgroups:threadsPerThreadgroup:"),
      ffiPtr!(tgCount),
      ffiPtr!(threadsPerTg),
    );
  });
}

// Fused flash-attention. One TG per head, bs = max(32, next-warp-multiple
// ≥ headDim). Writes out[h*headDim + i]; no scores scratch needed.
function launchFlashAttn(
  q: GpuScratch,
  kCache: GpuScratch,
  vCache: GpuScratch,
  out: GpuScratch,
  nHeads: number,
  headDim: number,
  kvRowSize: number,
  groupSize: number,
  ctxLen: number,
  scale: number,
): void {
  if (!devOpsPipes.flashAttn) throw new Error("parabun:gpu metal: flashAttn kernel missing");
  if (headDim > 256) throw new Error(`parabun:gpu metal: flashAttn headDim ${headDim} exceeds 256`);
  const { buf: qBuf, offset: qOff } = scratchBufferAndOffset(q);
  const { buf: kBuf, offset: kOff } = scratchBufferAndOffset(kCache);
  const { buf: vBuf, offset: vOff } = scratchBufferAndOffset(vCache);
  const { buf: oBuf, offset: oOff } = scratchBufferAndOffset(out);
  const bs = Math.max(32, ((headDim + 31) >> 5) << 5);
  encodeWith(encoder => {
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), devOpsPipes.flashAttn.pipe);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), qBuf, qOff, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), kBuf, kOff, 1n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), vBuf, vOff, 2n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), oBuf, oOff, 3n);
    const pHd = new Uint32Array([headDim]);
    const pKv = new Uint32Array([kvRowSize]);
    const pGs = new Uint32Array([groupSize]);
    const pCtx = new Uint32Array([ctxLen]);
    const pScale = new Float32Array([scale]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pHd), 4n, 4n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pKv), 4n, 5n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pGs), 4n, 6n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pCtx), 4n, 7n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pScale), 4n, 8n);
    const tgCount = new BigUint64Array([BigInt(nHeads), 1n, 1n]);
    const threadsPerTg = new BigUint64Array([BigInt(bs), 1n, 1n]);
    msgSend_4_ptr_ptr!(
      encoder,
      sel("dispatchThreadgroups:threadsPerThreadgroup:"),
      ffiPtr!(tgCount),
      ffiPtr!(threadsPerTg),
    );
  });
}

// No-op on Metal: every encodeWith() call ends in waitUntilCompleted,
// so there's nothing outstanding by the time control returns to JS.
// Kept as a method for parabun:llm surface parity with the CUDA backend,
// where cuCtxSynchronize() is needed after async launches.
function syncNoop(): void {}

// Public devOps table. Returns null until every kernel in the canonical
// list is compiled AND the full port is flagged complete — parabun:llm's
// forward pass is all-or-nothing, so partial tables would mean silent
// runtime crashes on kernels we haven't ported yet.
function getDevOps(): any | null {
  if (!probe()) return null;
  if (!devOpsComplete) return null;
  return {
    allocScratch,
    freeScratch,
    uploadScratch,
    downloadScratch,
    scratchSlice,
    embedLookup: launchEmbedLookup,
    accum: launchAccum,
    biasAdd: launchBiasAdd,
    siluMul: launchSiluMul,
    add: launchAdd,
    kvStore: launchKvStore,
    rmsnorm: launchRmsnorm,
    argmax: launchArgmax,
    ropeNorm: launchRopeNorm,
    ropeNeox: launchRopeNeox,
    attnScores: launchAttnScores,
    softmaxRow: launchSoftmaxRow,
    attnOutput: launchAttnOutput,
    matVec: launchMatVecDev,
    flashAttn: launchFlashAttn,
    rope: launchRopeDispatch,
    sync: syncNoop,
  };
}

// Partial devOps accessor for tests / incremental validation. Exposes
// whichever kernel wrappers have been wired, regardless of
// devOpsComplete. parabun:llm does NOT call this; it's only for
// test/bench harnesses.
function _getPartialDevOps(): any {
  if (!probe()) return null;
  const out: Record<string, unknown> = {
    allocScratch,
    freeScratch,
    uploadScratch,
    downloadScratch,
    scratchSlice,
  };
  if (devOpsPipes.embedLookup) out.embedLookup = launchEmbedLookup;
  if (devOpsPipes.accum) out.accum = launchAccum;
  if (devOpsPipes.biasAdd) out.biasAdd = launchBiasAdd;
  if (devOpsPipes.siluMul) out.siluMul = launchSiluMul;
  if (devOpsPipes.add) out.add = launchAdd;
  if (devOpsPipes.kvStore) out.kvStore = launchKvStore;
  if (devOpsPipes.rmsnorm) out.rmsnorm = launchRmsnorm;
  if (devOpsPipes.argmax) out.argmax = launchArgmax;
  if (devOpsPipes.ropeNorm) out.ropeNorm = launchRopeNorm;
  if (devOpsPipes.ropeNeox) out.ropeNeox = launchRopeNeox;
  if (devOpsPipes.attnScores) out.attnScores = launchAttnScores;
  if (devOpsPipes.softmaxRow) out.softmaxRow = launchSoftmaxRow;
  if (devOpsPipes.attnOutput) out.attnOutput = launchAttnOutput;
  if (devOpsPipes.matVec) out.matVec = launchMatVecDev;
  if (devOpsPipes.flashAttn) out.flashAttn = launchFlashAttn;
  if (devOpsPipes.ropeNorm && devOpsPipes.ropeNeox) out.rope = launchRopeDispatch;
  out.sync = syncNoop;
  return out;
}

function winsForSize(op: string, n: number, elemBytes: number): boolean {
  if (!probed && !probe()) return false;
  if (!probeResult) return false;
  if (op === "simdMap") return elemBytes === 4 && n >= MIN_SIMDMAP_ELEMS;
  if (op === "matVec") return elemBytes === 4 && n >= MIN_MATVEC_WINS_ELEMS;
  if (op === "matmul") return elemBytes === 4 && n >= MIN_MATMUL_DISPATCH_FLOPS;
  return false;
}

// ─── Backend methods ───────────────────────────────────────────────────────

// ─── reduce / argMin / argMax launchers ─────────────────────────────────
// Each kernel runs REDUCE_GRID threadgroups × REDUCE_BLOCK threads with
// a strided read loop, so total work is O(n) regardless of N. Host
// merges the small REDUCE_GRID-sized partial array. This mirrors
// cuda.ts's launchReduceF32 / launchArgF32 shape so the gpu.ts
// dispatch boundary is identical.
const REDUCE_GRID = 256;
const REDUCE_BLOCK = 256;

function dispatchReduceF32(pipeline: bigint, input: Float32Array, partialsBytes: number): Float32Array | null {
  if (pipeline === 0n) return null;
  if (!probe()) return null;
  const ptr = ffiPtr!;
  const n = input.length;

  const inBytes = BigInt(n * 4);
  const inBuf = newBufferFromF32(input, inBytes);
  if (inBuf === 0n) throw new Error("parabun:gpu metal: newBufferFromF32(reduce) failed");

  let partialsBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    partialsBuf = msgSend_4_u64_u64!(
      device,
      sel("newBufferWithLength:options:"),
      BigInt(partialsBytes),
      BigInt(MTL_STORAGE_MODE_SHARED),
    );
    if (partialsBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithLength(partials) failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), pipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), inBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), partialsBuf, 0n, 1n);
    const pN = new Uint32Array([n]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pN), 4n, 2n);

    // dispatchThreadgroups: REDUCE_GRID groups × REDUCE_BLOCK threads.
    const grid = new BigUint64Array([BigInt(REDUCE_GRID), 1n, 1n]);
    const threads = new BigUint64Array([BigInt(REDUCE_BLOCK), 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreadgroups:threadsPerThreadgroup:"), ptr(grid), ptr(threads));
    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const contents = msgSend_2!(partialsBuf, sel("contents"));
    if (contents === 0n) throw new Error("parabun:gpu metal: partials contents is null");
    const view = new Float32Array(ffiToArrayBuffer!(Number(contents), 0, partialsBytes));
    const out = new Float32Array(REDUCE_GRID);
    out.set(view.subarray(0, REDUCE_GRID));
    return out;
  } finally {
    objcRelease(inBuf);
    if (partialsBuf !== 0n) objcRelease(partialsBuf);
  }
}

function launchReduceMetalF32(input: Float32Array, op: "sum" | "min" | "max"): number | null {
  const n = input.length;
  if (n === 0) {
    // Match the CPU + CUDA reductions: empty sum is 0, empty extrema NaN.
    return op === "sum" ? 0 : NaN;
  }
  const pipeline = op === "sum" ? reduceSumPipeline : op === "min" ? reduceMinPipeline : reduceMaxPipeline;
  const partials = dispatchReduceF32(pipeline, input, REDUCE_GRID * 4);
  if (partials === null) return null;

  if (op === "sum") {
    // Kahan-compensated sum to match cuda.ts's launchReduceF32 host-side.
    let s = 0;
    let c = 0;
    for (let i = 0; i < REDUCE_GRID; i++) {
      const y = partials[i] - c;
      const t = s + y;
      c = t - s - y;
      s = t;
    }
    return s;
  }
  if (op === "min") {
    let best = Infinity;
    for (let i = 0; i < REDUCE_GRID; i++) {
      const v = partials[i];
      if (v < best) best = v;
    }
    return Number.isFinite(best) ? best : NaN;
  }
  // max
  let best = -Infinity;
  for (let i = 0; i < REDUCE_GRID; i++) {
    const v = partials[i];
    if (v > best) best = v;
  }
  return Number.isFinite(best) ? best : NaN;
}

function launchArgMetalF32(input: Float32Array, mode: "min" | "max"): number | null {
  const n = input.length;
  if (n === 0) return -1; // public wrapper translates this into a RangeError
  const pipeline = mode === "min" ? argminGridPipeline : argmaxGridPipeline;
  if (pipeline === 0n) return null;
  if (!probe()) return null;
  const ptr = ffiPtr!;

  const inBytes = BigInt(n * 4);
  const inBuf = newBufferFromF32(input, inBytes);
  if (inBuf === 0n) throw new Error("parabun:gpu metal: newBufferFromF32(arg) failed");

  let pvBuf: bigint = 0n;
  let piBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    const partialsBytes = BigInt(REDUCE_GRID * 4);
    pvBuf = msgSend_4_u64_u64!(
      device,
      sel("newBufferWithLength:options:"),
      partialsBytes,
      BigInt(MTL_STORAGE_MODE_SHARED),
    );
    piBuf = msgSend_4_u64_u64!(
      device,
      sel("newBufferWithLength:options:"),
      partialsBytes,
      BigInt(MTL_STORAGE_MODE_SHARED),
    );
    if (pvBuf === 0n || piBuf === 0n) {
      throw new Error("parabun:gpu metal: newBufferWithLength(partials v/i) failed");
    }

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), pipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), inBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), pvBuf, 0n, 1n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), piBuf, 0n, 2n);
    const pN = new Uint32Array([n]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pN), 4n, 3n);

    const grid = new BigUint64Array([BigInt(REDUCE_GRID), 1n, 1n]);
    const threads = new BigUint64Array([BigInt(REDUCE_BLOCK), 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreadgroups:threadsPerThreadgroup:"), ptr(grid), ptr(threads));
    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const pvContents = msgSend_2!(pvBuf, sel("contents"));
    const piContents = msgSend_2!(piBuf, sel("contents"));
    if (pvContents === 0n || piContents === 0n) {
      throw new Error("parabun:gpu metal: partials contents is null");
    }
    const pv = new Float32Array(ffiToArrayBuffer!(Number(pvContents), 0, REDUCE_GRID * 4));
    const pi = new Uint32Array(ffiToArrayBuffer!(Number(piContents), 0, REDUCE_GRID * 4));

    // Host merge: same tie-break as the device code (lower index wins
    // on equal values; uninitialised slots — index = 0xffffffffu —
    // ignored unless they're all we have).
    const SENTINEL = 0xffffffff;
    let bestI = SENTINEL;
    let bestV = mode === "min" ? Infinity : -Infinity;
    for (let i = 0; i < REDUCE_GRID; i++) {
      const ci = pi[i];
      if (ci === SENTINEL) continue;
      const cv = pv[i];
      let better: boolean;
      if (bestI === SENTINEL) better = true;
      else if (mode === "min") {
        better = cv < bestV || (cv === bestV && ci < bestI);
      } else {
        better = cv > bestV || (cv === bestV && ci < bestI);
      }
      if (better) {
        bestI = ci;
        bestV = cv;
      }
    }
    return bestI === SENTINEL ? -1 : bestI;
  } finally {
    objcRelease(inBuf);
    if (pvBuf !== 0n) objcRelease(pvBuf);
    if (piBuf !== 0n) objcRelease(piBuf);
  }
}

// gpu.ts public surface — Backend.reduce / argMin / argMax. Signature
// matches cuda.ts so the gpu.ts dispatcher hits one or the other based
// on resolveActive(). null return means "device path declined" — the
// public wrapper falls through to the CPU reference.
function reduce(input: FArray | GpuHandle, op: "sum" | "min" | "max"): number {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  if (!(view instanceof Float32Array)) {
    throw new TypeError("parabun:gpu metal: reduce requires Float32Array (f64 not yet supported)");
  }
  const r = launchReduceMetalF32(view, op);
  if (r !== null) return r;
  // Fallback path is handled by the gpu.ts public wrapper — but be
  // friendly if Metal isn't available: do the same Kahan-compensated
  // host-side pass cuda.ts uses, so the call never fails silently.
  if (op === "sum") {
    let s = 0;
    let c = 0;
    for (let i = 0; i < view.length; i++) {
      const y = view[i] - c;
      const t = s + y;
      c = t - s - y;
      s = t;
    }
    return s;
  }
  if (op === "min") {
    let m = Infinity;
    for (let i = 0; i < view.length; i++) if (view[i] < m) m = view[i];
    return view.length === 0 ? NaN : m;
  }
  let m = -Infinity;
  for (let i = 0; i < view.length; i++) if (view[i] > m) m = view[i];
  return view.length === 0 ? NaN : m;
}

function argMin(input: FArray | GpuHandle): number {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  if (!(view instanceof Float32Array)) {
    throw new TypeError("parabun:gpu metal: argMin requires Float32Array (f64 not yet supported)");
  }
  const r = launchArgMetalF32(view, "min");
  if (r !== null) return r;
  // Pipeline missing — host path. Same NaN convention as cuda.ts.
  let bestI = -1;
  let bestV = Infinity;
  for (let i = 0; i < view.length; i++) {
    const v = view[i];
    if (Number.isNaN(v)) return i;
    if (bestI === -1 || v < bestV || (v === bestV && i < bestI)) {
      bestV = v;
      bestI = i;
    }
  }
  return bestI;
}

function argMax(input: FArray | GpuHandle): number {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  if (!(view instanceof Float32Array)) {
    throw new TypeError("parabun:gpu metal: argMax requires Float32Array (f64 not yet supported)");
  }
  const r = launchArgMetalF32(view, "max");
  if (r !== null) return r;
  let bestI = -1;
  let bestV = -Infinity;
  for (let i = 0; i < view.length; i++) {
    const v = view[i];
    if (Number.isNaN(v)) return i;
    if (bestI === -1 || v > bestV || (v === bestV && i < bestI)) {
      bestV = v;
      bestI = i;
    }
  }
  return bestI;
}

// ─── histogram launcher ──────────────────────────────────────────────
const HISTOGRAM_MAX_BINS = 1024;

function launchHistogramMetalF32(input: Float32Array, bins: number, minV: number, maxV: number): Uint32Array | null {
  if (histogramPipeline === 0n) return null;
  if (!probe()) return null;
  if (bins <= 0 || bins > HISTOGRAM_MAX_BINS) return null;
  const ptr = ffiPtr!;
  const n = input.length;
  if (n === 0) return new Uint32Array(bins);

  const inBytes = BigInt(n * 4);
  const inBuf = newBufferFromF32(input, inBytes);
  if (inBuf === 0n) throw new Error("parabun:gpu metal: newBufferFromF32(histogram) failed");

  let outBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    const outBytes = BigInt(bins * 4);
    outBuf = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), outBytes, BigInt(MTL_STORAGE_MODE_SHARED));
    if (outBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithLength(histogram out) failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), histogramPipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), inBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), outBuf, 0n, 1n);
    const pN = new Uint32Array([n]);
    const pBins = new Uint32Array([bins]);
    const pMin = new Float32Array([minV]);
    const pMax = new Float32Array([maxV]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pN), 4n, 2n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pBins), 4n, 3n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pMin), 4n, 4n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pMax), 4n, 5n);

    const grid = new BigUint64Array([BigInt(REDUCE_GRID), 1n, 1n]);
    const threads = new BigUint64Array([BigInt(REDUCE_BLOCK), 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreadgroups:threadsPerThreadgroup:"), ptr(grid), ptr(threads));
    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const contents = msgSend_2!(outBuf, sel("contents"));
    if (contents === 0n) throw new Error("parabun:gpu metal: histogram out contents is null");
    const view = new Uint32Array(ffiToArrayBuffer!(Number(contents), 0, bins * 4));
    const out = new Uint32Array(bins);
    out.set(view);
    return out;
  } finally {
    objcRelease(inBuf);
    if (outBuf !== 0n) objcRelease(outBuf);
  }
}

function histogram(input: FArray | GpuHandle, bins: number, minV: number, maxV: number): Uint32Array | null {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  if (!(view instanceof Float32Array)) {
    throw new TypeError("parabun:gpu metal: histogram requires Float32Array (f64 not yet supported)");
  }
  return launchHistogramMetalF32(view, bins, minV, maxV);
}

// ─── variance launcher ───────────────────────────────────────────────
// Two-pass: pass 1 reuses launchReduceMetalF32 to get sum (host divides
// by n for the mean). Pass 2 dispatches variance_sumsq_f32 with the
// precomputed mean, host sums + divides by (n - ddof).
function launchVarianceMetalF32(input: Float32Array, ddof: number): number | null {
  if (varianceSumsqPipeline === 0n || reduceSumPipeline === 0n) return null;
  if (!probe()) return null;
  const n = input.length;
  if (n === 0 || ddof >= n) return NaN;

  // Pass 1: sum.
  const sum = launchReduceMetalF32(input, "sum");
  if (sum === null) return null;
  const mean = sum / n;

  // Pass 2: dispatch variance_sumsq.
  const ptr = ffiPtr!;
  const inBytes = BigInt(n * 4);
  const inBuf = newBufferFromF32(input, inBytes);
  if (inBuf === 0n) throw new Error("parabun:gpu metal: newBufferFromF32(variance) failed");

  let partialsBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    const partialsBytes = BigInt(REDUCE_GRID * 4);
    partialsBuf = msgSend_4_u64_u64!(
      device,
      sel("newBufferWithLength:options:"),
      partialsBytes,
      BigInt(MTL_STORAGE_MODE_SHARED),
    );
    if (partialsBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithLength(variance partials) failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), varianceSumsqPipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), inBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), partialsBuf, 0n, 1n);
    const pN = new Uint32Array([n]);
    const pMean = new Float32Array([mean]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pN), 4n, 2n);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pMean), 4n, 3n);

    const grid = new BigUint64Array([BigInt(REDUCE_GRID), 1n, 1n]);
    const threads = new BigUint64Array([BigInt(REDUCE_BLOCK), 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreadgroups:threadsPerThreadgroup:"), ptr(grid), ptr(threads));
    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const contents = msgSend_2!(partialsBuf, sel("contents"));
    if (contents === 0n) throw new Error("parabun:gpu metal: variance partials contents is null");
    const partials = new Float32Array(ffiToArrayBuffer!(Number(contents), 0, REDUCE_GRID * 4));
    let sumSq = 0;
    let c2 = 0;
    for (let i = 0; i < REDUCE_GRID; i++) {
      const y = partials[i] - c2;
      const t = sumSq + y;
      c2 = t - sumSq - y;
      sumSq = t;
    }
    return sumSq / (n - ddof);
  } finally {
    objcRelease(inBuf);
    if (partialsBuf !== 0n) objcRelease(partialsBuf);
  }
}

function variance(input: FArray | GpuHandle, ddof: number): number {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  if (!(view instanceof Float32Array)) {
    throw new TypeError("parabun:gpu metal: variance requires Float32Array (f64 not yet supported)");
  }
  const r = launchVarianceMetalF32(view, ddof);
  if (r !== null) return r;
  // Pipeline missing — host fallback (Kahan-compensated, matches cuda.ts).
  if (view.length === 0 || ddof >= view.length) return NaN;
  let s = 0;
  let c = 0;
  for (let i = 0; i < view.length; i++) {
    const y = view[i] - c;
    const t = s + y;
    c = t - s - y;
    s = t;
  }
  const mean = s / view.length;
  let sumSq = 0;
  let c2 = 0;
  for (let i = 0; i < view.length; i++) {
    const d = view[i] - mean;
    const y = d * d - c2;
    const t = sumSq + y;
    c2 = t - sumSq - y;
    sumSq = t;
  }
  return sumSq / (view.length - ddof);
}

// ─── Recursive scan launcher ─────────────────────────────────────────
const SCAN_BLOCK = 256;
const SCAN_LEAF_MAX = 1024;

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function scanLeafMetal(encoder: bigint, dBuf: bigint, n: number): boolean {
  if (scanBlocksumsInclusivePipeline === 0n) return false;
  const ptr = ffiPtr!;
  const block = nextPow2(Math.max(2, n));
  msgSend_3_id!(encoder, sel("setComputePipelineState:"), scanBlocksumsInclusivePipeline);
  msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), dBuf, 0n, 0n);
  const pN = new Uint32Array([n]);
  msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pN), 4n, 1n);
  const grid = new BigUint64Array([1n, 1n, 1n]);
  const threads = new BigUint64Array([BigInt(block), 1n, 1n]);
  msgSend_4_ptr_ptr!(encoder, sel("dispatchThreadgroups:threadsPerThreadgroup:"), ptr(grid), ptr(threads));
  return true;
}

function scanDeviceInPlaceMetal(encoder: bigint, dBuf: bigint, n: number, scratchBuffers: bigint[]): boolean {
  if (n <= 1) return true;
  if (n <= SCAN_LEAF_MAX) return scanLeafMetal(encoder, dBuf, n);
  if (scanBlockInclusivePipeline === 0n || scanAddOffsetsPipeline === 0n || scanBlocksumsInclusivePipeline === 0n) {
    return false;
  }
  const ptr = ffiPtr!;
  const numBlocks = Math.ceil(n / SCAN_BLOCK);
  const sumsBytes = BigInt(numBlocks * 4);
  const dSums = msgSend_4_u64_u64!(
    device,
    sel("newBufferWithLength:options:"),
    sumsBytes,
    BigInt(MTL_STORAGE_MODE_SHARED),
  );
  if (dSums === 0n) return false;
  scratchBuffers.push(dSums);

  // Stage 1: per-block scan in-place.
  msgSend_3_id!(encoder, sel("setComputePipelineState:"), scanBlockInclusivePipeline);
  msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), dBuf, 0n, 0n);
  msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), dBuf, 0n, 1n);
  msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), dSums, 0n, 2n);
  const pN = new Uint32Array([n]);
  msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pN), 4n, 3n);
  {
    const grid = new BigUint64Array([BigInt(numBlocks), 1n, 1n]);
    const threads = new BigUint64Array([BigInt(SCAN_BLOCK), 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreadgroups:threadsPerThreadgroup:"), ptr(grid), ptr(threads));
  }

  // Recurse on dSums.
  if (!scanDeviceInPlaceMetal(encoder, dSums, numBlocks, scratchBuffers)) return false;

  // Stage 3: add offsets.
  msgSend_3_id!(encoder, sel("setComputePipelineState:"), scanAddOffsetsPipeline);
  msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), dBuf, 0n, 0n);
  msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), dSums, 0n, 1n);
  msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pN), 4n, 2n);
  {
    const grid = new BigUint64Array([BigInt(numBlocks), 1n, 1n]);
    const threads = new BigUint64Array([BigInt(SCAN_BLOCK), 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreadgroups:threadsPerThreadgroup:"), ptr(grid), ptr(threads));
  }
  return true;
}

function launchScanMetalF32(input: Float32Array): Float32Array | null {
  if (scanBlockInclusivePipeline === 0n || scanBlocksumsInclusivePipeline === 0n || scanAddOffsetsPipeline === 0n) {
    return null;
  }
  if (!probe()) return null;
  const n = input.length;
  if (n === 0) return new Float32Array(0);
  const ptr = ffiPtr!;

  const bytes = BigInt(n * 4);
  const dOut = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), bytes, BigInt(MTL_STORAGE_MODE_SHARED));
  if (dOut === 0n) throw new Error("parabun:gpu metal: newBufferWithLength(scan out) failed");

  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  const scratchBuffers: bigint[] = [];
  try {
    // HtoD via memcpy into the shared-memory output buffer.
    const contents = msgSend_2!(dOut, sel("contents"));
    if (contents === 0n) throw new Error("parabun:gpu metal: scan out contents is null");
    const view = new Float32Array(ffiToArrayBuffer!(Number(contents), 0, n * 4));
    view.set(input);

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    if (!scanDeviceInPlaceMetal(encoder, dOut, n, scratchBuffers)) {
      msgSend_2!(encoder, sel("endEncoding"));
      return null;
    }
    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const out = new Float32Array(n);
    out.set(view);
    return out;
  } finally {
    objcRelease(dOut);
    for (const b of scratchBuffers) objcRelease(b);
  }
}

function scan(input: FArray | GpuHandle): FArray {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  if (!(view instanceof Float32Array)) {
    throw new TypeError("parabun:gpu metal: scan requires Float32Array (f64 not yet supported)");
  }
  const r = launchScanMetalF32(view);
  if (r !== null) return r;
  // Pipeline missing — Kahan-compensated host scan, matches cuda.ts.
  const out = new Float32Array(view.length);
  let s = 0;
  let c = 0;
  for (let i = 0; i < view.length; i++) {
    const y = view[i] - c;
    const t = s + y;
    c = t - s - y;
    s = t;
    out[i] = s;
  }
  return out;
}

// ─── Bitonic-sort quantile launcher ──────────────────────────────────
const SORT_BLOCK = 256;
const SORT_MAX_ELEMS = 1 << 24; // 16M; padded to nextPow2

function launchQuantileMetalF32(input: Float32Array, q: number): number | null {
  if (bitonicStepPipeline === 0n) return null;
  if (!probe()) return null;
  const n = input.length;
  if (n === 0) return NaN;
  if (n === 1) return input[0];
  if (n > SORT_MAX_ELEMS) return null;

  const ptr = ffiPtr!;
  const nPadded = nextPow2(n);
  const bytes = BigInt(nPadded * 4);
  const dBuf = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), bytes, BigInt(MTL_STORAGE_MODE_SHARED));
  if (dBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithLength(sort) failed");

  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    // Prepare padded buffer in-place: copy input + +Inf tail.
    const contents = msgSend_2!(dBuf, sel("contents"));
    if (contents === 0n) throw new Error("parabun:gpu metal: sort buffer contents is null");
    const view = new Float32Array(ffiToArrayBuffer!(Number(contents), 0, nPadded * 4));
    view.set(input);
    for (let i = n; i < nPadded; i++) view[i] = Infinity;

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    msgSend_3_id!(encoder, sel("setComputePipelineState:"), bitonicStepPipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), dBuf, 0n, 0n);
    const pN = new Uint32Array([nPadded]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pN), 4n, 3n);

    // dispatchThreads: one thread per element, full grid each step.
    // Using the same encoder + pipeline; we re-set the j/k constants
    // each step but reuse the buffer binding.
    const grid = new BigUint64Array([BigInt(nPadded), 1n, 1n]);
    const threads = new BigUint64Array([BigInt(SORT_BLOCK), 1n, 1n]);
    for (let k = 2; k <= nPadded; k <<= 1) {
      for (let j = k >> 1; j > 0; j >>= 1) {
        const pJ = new Uint32Array([j]);
        const pK = new Uint32Array([k]);
        msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pJ), 4n, 1n);
        msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ptr(pK), 4n, 2n);
        msgSend_4_ptr_ptr!(encoder, sel("dispatchThreads:threadsPerThreadgroup:"), ptr(grid), ptr(threads));
      }
    }
    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const pos = q * (n - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return view[lo];
    const frac = pos - lo;
    return view[lo] * (1 - frac) + view[hi] * frac;
  } finally {
    objcRelease(dBuf);
  }
}

function quantile(input: FArray | GpuHandle, q: number): number | null {
  const view = isGpuHandle(input) ? (input.view as Float32Array) : input;
  if (!(view instanceof Float32Array)) {
    throw new TypeError("parabun:gpu metal: quantile requires Float32Array (f64 not yet supported)");
  }
  return launchQuantileMetalF32(view, q);
}

function dot(a: FArray | GpuHandle, b: FArray | GpuHandle): number {
  return simd.dot(unwrapHandle(a), unwrapHandle(b));
}

function matVec(matrix: FArray | GpuHandle, vector: FArray, nRows: number, nCols: number): FArray {
  const matIsHandle = isGpuHandle(matrix);
  if (matIsHandle && matrix.released) {
    throw new Error("parabun:gpu: matVec called on released handle");
  }
  // Quantized residency: dispatch to the Q-aware kernel without
  // materializing f32 weights. Threshold checks don't apply — hold()
  // already committed to device residency, and there's no CPU fallback
  // for raw super-block bytes.
  if (matIsHandle && matrix.qFormat === "q4_K") {
    if (!(vector instanceof Float32Array)) {
      throw new TypeError("parabun:gpu metal: q4_K matVec requires a Float32Array vector");
    }
    if (matVecQ4KPipeline === 0n || !probe()) {
      throw new Error("parabun:gpu metal: q4_K kernel unavailable on this device");
    }
    return launchMatVecQ4K(matrix, vector, nRows, nCols);
  }
  if (matIsHandle && matrix.qFormat === "q6_K") {
    if (!(vector instanceof Float32Array)) {
      throw new TypeError("parabun:gpu metal: q6_K matVec requires a Float32Array vector");
    }
    if (matVecQ6KPipeline === 0n || !probe()) {
      throw new Error("parabun:gpu metal: q6_K kernel unavailable on this device");
    }
    return launchMatVecQ6K(matrix, vector, nRows, nCols);
  }
  const matView = matIsHandle ? matrix.view : (matrix as FArray);
  if (
    matView instanceof Float32Array &&
    vector instanceof Float32Array &&
    probe() &&
    nRows * nCols >= MIN_MATVEC_DISPATCH_ELEMS &&
    // f64 handles can't take the MSL kernel; matIsHandle with f64 → simd path.
    (!matIsHandle || matrix.type === "f32")
  ) {
    return launchMatVecF32(matIsHandle ? matrix : matView, vector, nRows, nCols);
  }
  return simd.matVec(matView as any, vector as any, nRows, nCols);
}

function matmul(a: FArray | GpuHandle, b: FArray | GpuHandle, m: number, k: number, n: number, out?: FArray): FArray {
  const aIsHandle = isGpuHandle(a);
  const bIsHandle = isGpuHandle(b);
  if (aIsHandle && a.released) throw new Error("parabun:gpu: matmul called on released handle");
  if (bIsHandle && b.released) throw new Error("parabun:gpu: matmul called on released handle");
  const av = aIsHandle ? a.view : (a as FArray);
  const bv = bIsHandle ? b.view : (b as FArray);
  if (av.constructor !== bv.constructor) {
    throw new TypeError(
      `a and b must both be Float32Array or both be Float64Array; got ${av.constructor.name} and ${bv.constructor.name}`,
    );
  }
  // MSL kernel path: f32 inputs, probe succeeded, and either (a) a resident
  // handle already staged its MTLBuffer, or (b) the work is big enough to
  // amortize a cold dispatch. Otherwise fall back to the triple loop.
  const residentA = aIsHandle && a.type === "f32" && a.buffer !== 0n;
  const residentB = bIsHandle && b.type === "f32" && b.buffer !== 0n;
  const anyResident = residentA || residentB;
  if (
    av instanceof Float32Array &&
    bv instanceof Float32Array &&
    (out === undefined || out instanceof Float32Array) &&
    probe() &&
    (anyResident || m * n * k >= MIN_MATMUL_DISPATCH_FLOPS)
  ) {
    return launchMatmulF32(
      aIsHandle ? (a as GpuHandle) : (av as Float32Array),
      bIsHandle ? (b as GpuHandle) : (bv as Float32Array),
      m,
      k,
      n,
      out instanceof Float32Array ? out : undefined,
    );
  }
  let dst: FArray;
  if (out !== undefined) {
    if (out.constructor !== av.constructor) {
      throw new TypeError(`out type ${out.constructor.name} must match a/b type ${av.constructor.name}`);
    }
    dst = out;
    for (let i = 0; i < m * n; i++) dst[i] = 0;
  } else {
    dst = (av instanceof Float32Array ? new Float32Array(m * n) : new Float64Array(m * n)) as FArray;
  }
  for (let i = 0; i < m; i++) {
    const aRow = i * k;
    const oRow = i * n;
    for (let p = 0; p < k; p++) {
      const x = av[aRow + p];
      if (x === 0) continue;
      const bRow = p * n;
      for (let j = 0; j < n; j++) dst[oRow + j] += x * bv[bRow + j];
    }
  }
  return dst;
}

// ─── Dynamic MSL kernel compilation ──────────────────────────────────────
//
// For non-affine pure functions on Float32Array, compile a custom MSL
// compute shader at runtime via [MTLDevice newLibraryWithSource:...].
// Same approach as the NVRTC path in cuda.ts but targeting Metal.

const MSL_MATH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bMath\.sin\b/g, "sin"],
  [/\bMath\.cos\b/g, "cos"],
  [/\bMath\.tan\b/g, "tan"],
  [/\bMath\.asin\b/g, "asin"],
  [/\bMath\.acos\b/g, "acos"],
  [/\bMath\.atan\b/g, "atan"],
  [/\bMath\.atan2\b/g, "atan2"],
  [/\bMath\.exp\b/g, "exp"],
  [/\bMath\.log\b/g, "log"],
  [/\bMath\.log2\b/g, "log2"],
  [/\bMath\.log10\b/g, "log10"],
  [/\bMath\.sqrt\b/g, "sqrt"],
  [/\bMath\.cbrt\b/g, "cbrt"],
  [/\bMath\.abs\b/g, "abs"],
  [/\bMath\.floor\b/g, "floor"],
  [/\bMath\.ceil\b/g, "ceil"],
  [/\bMath\.round\b/g, "round"],
  [/\bMath\.trunc\b/g, "trunc"],
  [/\bMath\.sign\b/g, "sign"],
  [/\bMath\.min\b/g, "min"],
  [/\bMath\.max\b/g, "max"],
  [/\bMath\.pow\b/g, "pow"],
  [/\bMath\.hypot\b/g, "hypot"],
  [/\bMath\.PI\b/g, "3.14159265358979323846f"],
  [/\bMath\.E\b/g, "2.71828182845904523536f"],
  [/\bMath\.LN2\b/g, "0.6931471805599453f"],
  [/\bMath\.LN10\b/g, "2.302585092994046f"],
  [/\bMath\.SQRT2\b/g, "1.4142135623730951f"],
];

function extractReturnExpr(fnSrc: string): { param: string; expr: string } | null {
  let m: RegExpMatchArray | null;
  m = fnSrc.match(/^\s*(?:pure\s+)?(?:function\s+\w*)?\s*\(\s*(\w+)\s*(?:,\s*\w+\s*)?\)\s*(?:=>|{)\s*/);
  if (!m) m = fnSrc.match(/^\s*(?:pure\s+)?\(\s*(\w+)\s*(?:,\s*\w+\s*)?\)\s*=>\s*/);
  if (!m) m = fnSrc.match(/^\s*(?:pure\s+)?(\w+)\s*=>\s*/);
  if (!m) return null;

  const param = m[1];
  const rest = fnSrc.slice(m[0].length);

  if (!fnSrc.includes("{") || fnSrc.indexOf("{") > fnSrc.indexOf("=>")) {
    const expr = rest.replace(/\s*;?\s*$/, "");
    if (expr.length === 0) return null;
    return { param, expr };
  }

  const retMatch = rest.match(/^\s*return\s+(.+?)\s*;?\s*}\s*$/);
  if (!retMatch) return null;
  return { param, expr: retMatch[1] };
}

function translateExprToMSL(expr: string, param: string): string | null {
  let msl = expr;
  msl = msl.replace(
    /(\b\w+(?:\([^)]*\))?|\([^)]+\)|\d+(?:\.\d+)?)\s*\*\*\s*(\b\w+(?:\([^)]*\))?|\([^)]+\)|\d+(?:\.\d+)?)/g,
    "pow($1, $2)",
  );
  for (const [pat, rep] of MSL_MATH_REPLACEMENTS) msl = msl.replace(pat, rep);
  msl = msl.replace(/===/g, "==").replace(/!==/g, "!=");
  const mslBuiltins =
    /\b(sin|cos|tan|asin|acos|atan|atan2|exp|log|log2|log10|sqrt|cbrt|abs|floor|ceil|round|trunc|sign|min|max|pow|hypot)\b/g;
  const stripped = msl.replace(mslBuiltins, "").replace(new RegExp("\\b" + param + "\\b", "g"), "");
  if (/[a-zA-Z_]/.test(stripped)) return null;
  return msl;
}

function generateMSLKernelSrc(mslExpr: string, param: string): string {
  return `#include <metal_stdlib>
using namespace metal;
kernel void custom_map(
    device const float *inPtr  [[buffer(0)]],
    device       float *outPtr [[buffer(1)]],
    constant     uint  &n      [[buffer(2)]],
    uint                gid    [[thread_position_in_grid]])
{
    if (gid >= n) return;
    float ${param} = inPtr[gid];
    outPtr[gid] = ${mslExpr};
}
`;
}

type CachedMSLKernel = { pipeline: bigint; fn: bigint; lib: bigint; maxTg: number };
const mslKernelCache = new Map<string, CachedMSLKernel | null>();

function compileCustomMSLKernel(fnSrc: string): CachedMSLKernel | null {
  const cached = mslKernelCache.get(fnSrc);
  if (cached !== undefined) return cached;

  if (!probe()) {
    mslKernelCache.set(fnSrc, null);
    return null;
  }

  const extracted = extractReturnExpr(fnSrc);
  if (!extracted) {
    mslKernelCache.set(fnSrc, null);
    return null;
  }

  const mslExpr = translateExprToMSL(extracted.expr, extracted.param);
  if (!mslExpr) {
    mslKernelCache.set(fnSrc, null);
    return null;
  }

  const src = generateMSLKernelSrc(mslExpr, extracted.param);
  const nsSrc = nsstring(src);
  if (nsSrc === 0n) {
    mslKernelCache.set(fnSrc, null);
    return null;
  }

  const lib = msgSend_5_id_id_ptr!(device, sel("newLibraryWithSource:options:error:"), nsSrc, 0n, null);
  objcRelease(nsSrc);
  if (lib === 0n) {
    mslKernelCache.set(fnSrc, null);
    return null;
  }

  const result = compileKernel(lib, "custom_map");
  if (result === null) {
    objcRelease(lib);
    mslKernelCache.set(fnSrc, null);
    return null;
  }

  const entry: CachedMSLKernel = { pipeline: result.pipe, fn: result.fn, lib, maxTg: result.maxTg };
  mslKernelCache.set(fnSrc, entry);
  return entry;
}

function launchCustomMSLF32(a: Float32Array, kernel: CachedMSLKernel): Float32Array {
  const n = a.length;
  const bytes = BigInt(n * 4);

  const inBuf = msgSend_5_ptr_u64_u64_ret!(
    device,
    sel("newBufferWithBytes:length:options:"),
    ffiPtr!(a),
    bytes,
    BigInt(MTL_STORAGE_MODE_SHARED),
  );
  if (inBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithBytes failed");

  let outBuf: bigint = 0n;
  let cmdBuf: bigint = 0n;
  let encoder: bigint = 0n;
  try {
    outBuf = msgSend_4_u64_u64!(device, sel("newBufferWithLength:options:"), bytes, BigInt(MTL_STORAGE_MODE_SHARED));
    if (outBuf === 0n) throw new Error("parabun:gpu metal: newBufferWithLength failed");

    cmdBuf = msgSend_2!(commandQueue, sel("commandBuffer"));
    if (cmdBuf === 0n) throw new Error("parabun:gpu metal: commandBuffer failed");

    encoder = msgSend_2!(cmdBuf, sel("computeCommandEncoder"));
    if (encoder === 0n) throw new Error("parabun:gpu metal: computeCommandEncoder failed");

    msgSend_3_id!(encoder, sel("setComputePipelineState:"), kernel.pipeline);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), inBuf, 0n, 0n);
    msgSend_5_id_u64_u64!(encoder, sel("setBuffer:offset:atIndex:"), outBuf, 0n, 1n);

    const pN = new Uint32Array([n]);
    msgSend_5_ptr_u64_u64!(encoder, sel("setBytes:length:atIndex:"), ffiPtr!(pN), 4n, 2n);

    const tg = Math.min(kernel.maxTg, 256);
    const grid = new BigUint64Array([BigInt(n), 1n, 1n]);
    const threads = new BigUint64Array([BigInt(tg), 1n, 1n]);
    msgSend_4_ptr_ptr!(encoder, sel("dispatchThreads:threadsPerThreadgroup:"), ffiPtr!(grid), ffiPtr!(threads));

    msgSend_2!(encoder, sel("endEncoding"));
    msgSend_2!(cmdBuf, sel("commit"));
    msgSend_2!(cmdBuf, sel("waitUntilCompleted"));

    const contents = msgSend_2!(outBuf, sel("contents"));
    if (contents === 0n) throw new Error("parabun:gpu metal: contents returned null");
    const out = new Float32Array(n);
    out.set(new Float32Array(ffiToArrayBuffer!(contents, 0, n * 4)));
    return out;
  } finally {
    if (encoder !== 0n) objcRelease(encoder);
    if (cmdBuf !== 0n) objcRelease(cmdBuf);
    if (outBuf !== 0n) objcRelease(outBuf);
    objcRelease(inBuf);
  }
}

function conv2D(
  input: Float32Array | GpuHandle,
  kernel: Float32Array | GpuHandle,
  iW: number,
  iH: number,
  kW: number,
  kH: number,
): Float32Array {
  if (!probe() || conv2DPipeline === 0n) {
    // Probe failed — fall back to the public wrapper's CPU path. The wrapper
    // calls the backend's conv2D when present; signaling absence by throwing
    // would force callers to handle it. Returning the CPU result keeps the
    // backend method total without each caller doing the dance.
    const inputView = isGpuHandle(input) ? (input.view as Float32Array) : input;
    const kernelView = isGpuHandle(kernel) ? (kernel.view as Float32Array) : kernel;
    const oW = iW - kW + 1;
    const oH = iH - kH + 1;
    const out = new Float32Array(oW * oH);
    for (let y = 0; y < oH; y++) {
      for (let x = 0; x < oW; x++) {
        let acc = 0;
        for (let ky = 0; ky < kH; ky++) {
          const inRow = (y + ky) * iW + x;
          const kRow = ky * kW;
          for (let kx = 0; kx < kW; kx++) acc += inputView[inRow + kx] * kernelView[kRow + kx];
        }
        out[y * oW + x] = acc;
      }
    }
    return out;
  }
  return launchConv2D(input, kernel, iW, iH, kW, kH);
}

// Image-specific RGBA-uint8 Gaussian blur. Mirrors cuda.ts. Single-launch
// fused kernel — sidesteps the JS-side per-channel deinterleave that
// dominates a per-channel conv2D-based dispatch path.
function imageBlurRGBA(input: Uint8Array, w: number, h: number, radius: number): Uint8Array | null {
  if (radius < 0 || radius > 100) throw new RangeError("radius must be in [0, 100]");
  if (radius === 0) {
    const out = new Uint8Array(input.length);
    out.set(input);
    return out;
  }
  if (input.length !== w * h * 4) {
    throw new RangeError(`imageBlurRGBA: input length ${input.length} != w*h*4 (${w}*${h}*4 = ${w * h * 4})`);
  }
  if (!probe() || gaussianBlurRGBAu8Pipeline === 0n) return null;
  return launchGaussianBlurRGBAu8(input, w, h, radius);
}

function simdMap(fn: (x: number, i: number) => number, a: FArray | GpuHandle): FArray {
  if (typeof fn !== "function") throw new TypeError("fn must be a function");
  const view = unwrapHandle(a);
  if (view instanceof Float32Array && fn.length <= 1 && probe() && view.length >= MIN_SIMDMAP_ELEMS) {
    const aff = tryAffineKernel(fn as (x: number) => number);
    if (aff) return launchAffineF32(view, aff.k1, aff.k0);
    const kernel = compileCustomMSLKernel(fn.toString());
    if (kernel) return launchCustomMSLF32(view, kernel);
  }
  return simd.simdMap(fn, view as any);
}

function dispose(): void {
  for (const entry of mslKernelCache.values()) {
    if (entry) {
      objcRelease(entry.pipeline);
      objcRelease(entry.fn);
      objcRelease(entry.lib);
    }
  }
  mslKernelCache.clear();
  if (commandQueue !== 0n) {
    objcRelease(commandQueue);
    commandQueue = 0n;
  }
  if (matmulPipeline !== 0n) {
    objcRelease(matmulPipeline);
    matmulPipeline = 0n;
  }
  if (matmulFn !== 0n) {
    objcRelease(matmulFn);
    matmulFn = 0n;
  }
  if (conv2DPipeline !== 0n) {
    objcRelease(conv2DPipeline);
    conv2DPipeline = 0n;
  }
  if (conv2DFn !== 0n) {
    objcRelease(conv2DFn);
    conv2DFn = 0n;
  }
  if (gaussianBlurRGBAu8Pipeline !== 0n) {
    objcRelease(gaussianBlurRGBAu8Pipeline);
    gaussianBlurRGBAu8Pipeline = 0n;
  }
  if (gaussianBlurRGBAu8Fn !== 0n) {
    objcRelease(gaussianBlurRGBAu8Fn);
    gaussianBlurRGBAu8Fn = 0n;
  }
  if (matVecPipeline !== 0n) {
    objcRelease(matVecPipeline);
    matVecPipeline = 0n;
  }
  if (matVecFn !== 0n) {
    objcRelease(matVecFn);
    matVecFn = 0n;
  }
  if (matVecQ4KPipeline !== 0n) {
    objcRelease(matVecQ4KPipeline);
    matVecQ4KPipeline = 0n;
  }
  if (matVecQ4KFn !== 0n) {
    objcRelease(matVecQ4KFn);
    matVecQ4KFn = 0n;
  }
  if (matVecQ6KPipeline !== 0n) {
    objcRelease(matVecQ6KPipeline);
    matVecQ6KPipeline = 0n;
  }
  if (matVecQ6KFn !== 0n) {
    objcRelease(matVecQ6KFn);
    matVecQ6KFn = 0n;
  }
  // Secondary primitives — each pair guarded since any individual one
  // may have failed to compile at probe and is still 0n.
  if (reduceSumPipeline !== 0n) {
    objcRelease(reduceSumPipeline);
    reduceSumPipeline = 0n;
  }
  if (reduceSumFn !== 0n) {
    objcRelease(reduceSumFn);
    reduceSumFn = 0n;
  }
  if (reduceMinPipeline !== 0n) {
    objcRelease(reduceMinPipeline);
    reduceMinPipeline = 0n;
  }
  if (reduceMinFn !== 0n) {
    objcRelease(reduceMinFn);
    reduceMinFn = 0n;
  }
  if (reduceMaxPipeline !== 0n) {
    objcRelease(reduceMaxPipeline);
    reduceMaxPipeline = 0n;
  }
  if (reduceMaxFn !== 0n) {
    objcRelease(reduceMaxFn);
    reduceMaxFn = 0n;
  }
  if (argminGridPipeline !== 0n) {
    objcRelease(argminGridPipeline);
    argminGridPipeline = 0n;
  }
  if (argminGridFn !== 0n) {
    objcRelease(argminGridFn);
    argminGridFn = 0n;
  }
  if (argmaxGridPipeline !== 0n) {
    objcRelease(argmaxGridPipeline);
    argmaxGridPipeline = 0n;
  }
  if (argmaxGridFn !== 0n) {
    objcRelease(argmaxGridFn);
    argmaxGridFn = 0n;
  }
  if (histogramPipeline !== 0n) {
    objcRelease(histogramPipeline);
    histogramPipeline = 0n;
  }
  if (histogramFn !== 0n) {
    objcRelease(histogramFn);
    histogramFn = 0n;
  }
  if (varianceSumsqPipeline !== 0n) {
    objcRelease(varianceSumsqPipeline);
    varianceSumsqPipeline = 0n;
  }
  if (varianceSumsqFn !== 0n) {
    objcRelease(varianceSumsqFn);
    varianceSumsqFn = 0n;
  }
  if (scanBlockInclusivePipeline !== 0n) {
    objcRelease(scanBlockInclusivePipeline);
    scanBlockInclusivePipeline = 0n;
  }
  if (scanBlockInclusiveFn !== 0n) {
    objcRelease(scanBlockInclusiveFn);
    scanBlockInclusiveFn = 0n;
  }
  if (scanBlocksumsInclusivePipeline !== 0n) {
    objcRelease(scanBlocksumsInclusivePipeline);
    scanBlocksumsInclusivePipeline = 0n;
  }
  if (scanBlocksumsInclusiveFn !== 0n) {
    objcRelease(scanBlocksumsInclusiveFn);
    scanBlocksumsInclusiveFn = 0n;
  }
  if (scanAddOffsetsPipeline !== 0n) {
    objcRelease(scanAddOffsetsPipeline);
    scanAddOffsetsPipeline = 0n;
  }
  if (scanAddOffsetsFn !== 0n) {
    objcRelease(scanAddOffsetsFn);
    scanAddOffsetsFn = 0n;
  }
  if (bitonicStepPipeline !== 0n) {
    objcRelease(bitonicStepPipeline);
    bitonicStepPipeline = 0n;
  }
  if (bitonicStepFn !== 0n) {
    objcRelease(bitonicStepFn);
    bitonicStepFn = 0n;
  }
  if (simdMapPipeline !== 0n) {
    objcRelease(simdMapPipeline);
    simdMapPipeline = 0n;
  }
  if (simdMapFn !== 0n) {
    objcRelease(simdMapFn);
    simdMapFn = 0n;
  }
  for (const name of Object.keys(devOpsPipes)) {
    const k = devOpsPipes[name];
    if (k) {
      objcRelease(k.pipe);
      objcRelease(k.fn);
    }
    delete devOpsPipes[name];
  }
  devOpsComplete = false;
  if (metalLibraryObj !== 0n) {
    objcRelease(metalLibraryObj);
    metalLibraryObj = 0n;
  }
  device = 0n;
  selCache.clear();
  probed = false;
  probeResult = false;
  deviceName = "";
  hasUnifiedMemory = false;
}

function getDeviceName(): string {
  return deviceName;
}

function getHasUnifiedMemory(): boolean {
  return hasUnifiedMemory;
}

export default {
  name: "metal" as const,
  probe,
  winsForSize,
  dot,
  matVec,
  matmul,
  conv2D,
  imageBlurRGBA,
  // Secondary primitives for gpu.ts. Each launcher returns null when
  // the corresponding pipeline didn't compile at probe — gpu.ts then
  // falls through to the CPU reference. (Match cuda.ts surface.)
  reduce,
  argMin,
  argMax,
  histogram,
  variance,
  scan,
  quantile,
  simdMap,
  alloc,
  isAligned,
  hold,
  holdQ4K,
  holdQ6K,
  releaseHandle,
  releasePinned,
  allocScratch,
  freeScratch,
  uploadScratch,
  downloadScratch,
  scratchSlice,
  getDevOps,
  // Internal accessor for test / bench harnesses to exercise partial
  // devOps wiring before the full forward-pass surface is ported.
  _getPartialDevOps,
  dispose,
  getDeviceName,
  getHasUnifiedMemory,
};
