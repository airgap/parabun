// Parabun: native image-codec bindings for `bun:image`.
//
// JPEG decode via libjpeg-turbo, PNG decode via libpng's simplified
// png_image API. Both libs are statically linked (see
// scripts/build/deps/libjpeg-turbo.ts + libpng.ts), so no dlopen at
// runtime — symbols resolve at link time.
//
// v1 surface:
//   decode(bytes: Uint8Array) → { data, width, height, channels, format }
//
// JPEG always emits 3-channel RGB; PNG always emits 4-channel RGBA. The
// `channels` field on the result tells the caller which it is. Encode +
// resize follow in subsequent commits.

#include "root.h"
#include "parabun_image_codecs.h"

#include <JavaScriptCore/CallData.h>
#include <JavaScriptCore/JSCInlines.h>
#include <JavaScriptCore/JSGenericTypedArrayViewInlines.h>
#include <JavaScriptCore/JSObject.h>
#include <JavaScriptCore/JSTypedArrays.h>
#include <JavaScriptCore/ObjectConstructor.h>
#include <JavaScriptCore/TypedArrayType.h>

#include "ZigGlobalObject.h"

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <csetjmp>
#include <thread>
#include <vector>

// ─── SIMD intrinsics for the per-pixel hot path ───────────────────────────
// We rely on -march=haswell or better on x86 (AVX2 + FMA). On ARM64 NEON
// is part of the base ISA. The fallback path is the scalar code, which
// also still runs on hosts where neither is set.
#if defined(__x86_64__) || defined(_M_X64)
#include <immintrin.h>
#define PB_HAVE_X86_SIMD 1
#elif defined(__aarch64__) || defined(_M_ARM64)
#include <arm_neon.h>
#define PB_HAVE_NEON 1
#endif

extern "C" {
#include <jpeglib.h>
#include <png.h>
#include <webp/decode.h>
#include <webp/encode.h>
}

namespace Bun {

using namespace JSC;

// ─── JPEG decode ───────────────────────────────────────────────────────────

namespace {

// ─── Parallel row dispatch ────────────────────────────────────────────────
// Most of our pixel-pipeline kernels — resize, blur, sharpen, Sobel,
// per-pixel transforms — are embarrassingly parallel by output row. This
// helper splits a row range across threads so we get linear scaling on
// multi-core hosts. Below a per-thread minimum we fall through to a
// serial loop because std::thread's spawn-and-join cost (~50 µs each)
// would dominate the work. Above the threshold we cap at
// std::thread::hardware_concurrency() and let the OS scheduler handle
// the rest.
//
// The "work cost" is callers' responsibility — pass the dominant
// per-row work scaled to a single integer. Roughly: width × inner-loop
// ops. Callers pass `0` to skip the threshold check entirely (always
// parallelize), or a positive cost to enable the heuristic.

namespace {
// Tunable via PARABUN_IMAGE_THREADS env at runtime — default = number of
// hardware threads, capped at 16. Cached on first call so we don't
// re-read env / re-call hardware_concurrency every dispatch.
int numWorkerThreads()
{
    static int cached = []() -> int {
        if (const char* env = std::getenv("PARABUN_IMAGE_THREADS")) {
            int v = std::atoi(env);
            if (v > 0 && v <= 64) return v;
        }
        unsigned hc = std::thread::hardware_concurrency();
        if (hc == 0) hc = 4;          // hardware_concurrency() can return 0
        if (hc > 16) hc = 16;         // diminishing returns past 16
        return static_cast<int>(hc);
    }();
    return cached;
}

// Run fn(rowStart, rowEnd) for [0, totalRows), splitting across worker
// threads when there's enough work to justify the spawn-and-join cost.
template <typename Fn>
void parallelRows(uint32_t totalRows, size_t totalWorkUnits, Fn&& fn)
{
    // Below this threshold, serial wins because thread spawn cost
    // dominates. Tuned by hand so a 256 × 256 RGBA image (~262 K
    // pixel-channels) stays serial but a 1024 × 1024 (~4 M) parallelizes.
    constexpr size_t kSerialThreshold = 1 << 20; // 1 M work units
    const int threads = numWorkerThreads();
    if (threads <= 1 || totalRows < 2 || totalWorkUnits < kSerialThreshold) {
        fn(0u, totalRows);
        return;
    }
    const int actualThreads = std::min(threads, static_cast<int>(totalRows));
    const uint32_t chunk = (totalRows + actualThreads - 1) / actualThreads;
    std::vector<std::thread> pool;
    pool.reserve(actualThreads - 1);
    for (int t = 1; t < actualThreads; t++) {
        const uint32_t s = static_cast<uint32_t>(t) * chunk;
        const uint32_t e = std::min(s + chunk, totalRows);
        if (s >= e) break;
        pool.emplace_back([&fn, s, e] { fn(s, e); });
    }
    // Run the first chunk on the calling thread — saves one thread
    // spawn and keeps the work balanced.
    fn(0u, std::min(chunk, totalRows));
    for (auto& th : pool) th.join();
}
} // anonymous namespace

// libjpeg's default error handler calls exit(EXIT_FAILURE) on a malformed
// stream. Replace it with a longjmp so we can throw a JS exception cleanly
// instead of taking the whole process down.
struct JpegError {
    struct jpeg_error_mgr pub;
    jmp_buf jbuf;
    char message[JMSG_LENGTH_MAX];
};

extern "C" void jpegErrorExit(j_common_ptr cinfo)
{
    JpegError* err = reinterpret_cast<JpegError*>(cinfo->err);
    (*cinfo->err->format_message)(cinfo, err->message);
    std::longjmp(err->jbuf, 1);
}

// libjpeg's default emit_message prints warnings to stderr. Silence them —
// they're not actionable from a JS-binding context, and noisy on partially-
// truncated streams.
extern "C" void jpegOutputMessage(j_common_ptr) {}

bool decodeJpegBytes(
    const uint8_t* bytes, size_t len,
    std::vector<uint8_t>& outData,
    uint32_t& outWidth, uint32_t& outHeight, uint32_t& outChannels,
    char* outErr, size_t outErrLen)
{
    struct jpeg_decompress_struct cinfo;
    JpegError jerr;
    cinfo.err = jpeg_std_error(&jerr.pub);
    jerr.pub.error_exit = jpegErrorExit;
    jerr.pub.output_message = jpegOutputMessage;
    jerr.message[0] = '\0';

    if (setjmp(jerr.jbuf)) {
        jpeg_destroy_decompress(&cinfo);
        std::strncpy(outErr, jerr.message[0] ? jerr.message : "JPEG decode failed", outErrLen - 1);
        outErr[outErrLen - 1] = '\0';
        return false;
    }

    jpeg_create_decompress(&cinfo);
    jpeg_mem_src(&cinfo, bytes, len);
    if (jpeg_read_header(&cinfo, TRUE) != JPEG_HEADER_OK) {
        jpeg_destroy_decompress(&cinfo);
        std::strncpy(outErr, "not a JPEG", outErrLen - 1);
        return false;
    }

    cinfo.out_color_space = JCS_RGB;
    jpeg_start_decompress(&cinfo);

    outWidth = cinfo.output_width;
    outHeight = cinfo.output_height;
    outChannels = static_cast<uint32_t>(cinfo.output_components);

    const size_t rowSize = static_cast<size_t>(outWidth) * outChannels;
    outData.resize(rowSize * outHeight);

    while (cinfo.output_scanline < outHeight) {
        uint8_t* rowPtr = outData.data() + static_cast<size_t>(cinfo.output_scanline) * rowSize;
        JSAMPROW rows[1] = { rowPtr };
        jpeg_read_scanlines(&cinfo, rows, 1);
    }

    jpeg_finish_decompress(&cinfo);
    jpeg_destroy_decompress(&cinfo);
    return true;
}

// ─── PNG decode ────────────────────────────────────────────────────────────
// libpng's lower-level row-pointer API. We previously used the simplified
// png_image_* API which is 30 lines of C and "just works" but is also
// ~3-4× slower than the row-pointer path because it forces a single-buffer
// decode with no per-row processing. libvips (Sharp's backend) drops to
// this API for tile-aware filtering — matching them required dropping
// here too.
//
// Output format: 8-bit RGBA. Anything that's paletted, gray, or 16-bit
// gets transformed during the read so we always emit packed RGBA.

namespace {

// Memory-source reader callback for png_set_read_fn. The user data is a
// pair (cursor pointer, total length) packaged as a struct on the stack
// of decodePngBytes.
struct PngMemReader {
    const uint8_t* cur;
    size_t remaining;
};

void pngMemReadFn(png_structp png, png_bytep out, png_size_t want)
{
    auto* reader = static_cast<PngMemReader*>(png_get_io_ptr(png));
    if (reader->remaining < want) {
        png_error(png, "PNG read past end of input");
        return;
    }
    std::memcpy(out, reader->cur, want);
    reader->cur += want;
    reader->remaining -= want;
}

void pngWarnFn(png_structp, png_const_charp) {} // suppress libpng warnings

struct PngErrCapture {
    char* outErr;
    size_t outErrLen;
};

void pngErrFn(png_structp png, png_const_charp msg)
{
    auto* cap = static_cast<PngErrCapture*>(png_get_error_ptr(png));
    if (cap) {
        std::strncpy(cap->outErr, msg ? msg : "PNG error", cap->outErrLen - 1);
        cap->outErr[cap->outErrLen - 1] = '\0';
    }
    // longjmp out of libpng — required by the API contract.
    png_longjmp(png, 1);
}

} // anonymous namespace

bool decodePngBytes(
    const uint8_t* bytes, size_t len,
    std::vector<uint8_t>& outData,
    uint32_t& outWidth, uint32_t& outHeight, uint32_t& outChannels,
    char* outErr, size_t outErrLen)
{
    PngErrCapture errCap = { outErr, outErrLen };
    png_structp png = png_create_read_struct(PNG_LIBPNG_VER_STRING, &errCap, pngErrFn, pngWarnFn);
    if (!png) {
        std::strncpy(outErr, "PNG: create_read_struct failed", outErrLen - 1);
        return false;
    }
    png_infop info = png_create_info_struct(png);
    if (!info) {
        png_destroy_read_struct(&png, nullptr, nullptr);
        std::strncpy(outErr, "PNG: create_info_struct failed", outErrLen - 1);
        return false;
    }
    // Row-pointer storage is set up after png_read_info; until then we
    // bail to here on any libpng error.
    std::vector<png_bytep> rowPtrs;
    if (setjmp(png_jmpbuf(png))) {
        png_destroy_read_struct(&png, &info, nullptr);
        return false;
    }

    PngMemReader reader = { bytes, len };
    png_set_read_fn(png, &reader, pngMemReadFn);
    png_read_info(png, info);

    png_uint_32 w = 0, h = 0;
    int bitDepth = 0, colorType = 0;
    png_get_IHDR(png, info, &w, &h, &bitDepth, &colorType, nullptr, nullptr, nullptr);

    // Transformations to coerce all input to 8-bit RGBA:
    //   palette → RGB
    //   1/2/4-bit gray → 8-bit gray
    //   tRNS chunk → alpha channel
    //   16-bit channels → 8-bit (right-shift 8)
    //   gray → RGB (gray_to_rgb)
    //   missing alpha → opaque alpha
    if (colorType == PNG_COLOR_TYPE_PALETTE) png_set_palette_to_rgb(png);
    if (colorType == PNG_COLOR_TYPE_GRAY && bitDepth < 8) png_set_expand_gray_1_2_4_to_8(png);
    if (png_get_valid(png, info, PNG_INFO_tRNS)) png_set_tRNS_to_alpha(png);
    if (bitDepth == 16) png_set_strip_16(png);
    if (colorType == PNG_COLOR_TYPE_GRAY || colorType == PNG_COLOR_TYPE_GRAY_ALPHA) {
        png_set_gray_to_rgb(png);
    }
    // Always emit RGBA, even when source was RGB (or post-transform RGB).
    png_set_filler(png, 0xFF, PNG_FILLER_AFTER);
    png_read_update_info(png, info);

    outWidth = w;
    outHeight = h;
    outChannels = 4;
    const size_t rowBytes = static_cast<size_t>(w) * 4;
    outData.resize(rowBytes * h);

    rowPtrs.resize(h);
    for (uint32_t y = 0; y < h; y++) rowPtrs[y] = outData.data() + y * rowBytes;
    png_read_image(png, rowPtrs.data());
    png_read_end(png, info);

    png_destroy_read_struct(&png, &info, nullptr);
    return true;
}

// Detect format from the magic-bytes prefix.
//   JPEG: SOI marker (FF D8 FF).
//   PNG : 8-byte signature (89 50 4E 47 0D 0A 1A 0A — we check the first 4).
//   WebP: RIFF container with "WEBP" subtype tag at byte offset 8.
const char* detectFormat(const uint8_t* bytes, size_t len)
{
    if (len >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) return "jpeg";
    if (len >= 8 && bytes[0] == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') return "png";
    if (len >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
        && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') return "webp";
    return nullptr;
}

// ─── WebP decode ───────────────────────────────────────────────────────────
// libwebp's WebPDecodeRGBA handles both lossy (VP8) and lossless (VP8L)
// internally. Output is always 4-channel RGBA — alpha is always present
// even for opaque images (set to 255). The library mallocs the output
// buffer; we copy + free.

bool decodeWebPBytes(
    const uint8_t* bytes, size_t len,
    std::vector<uint8_t>& outData,
    uint32_t& outWidth, uint32_t& outHeight, uint32_t& outChannels,
    char* outErr, size_t outErrLen)
{
    int w = 0, h = 0;
    if (WebPGetInfo(bytes, len, &w, &h) == 0) {
        std::strncpy(outErr, "not a valid WebP", outErrLen - 1);
        return false;
    }
    if (w <= 0 || h <= 0) {
        std::strncpy(outErr, "WebP has invalid dimensions", outErrLen - 1);
        return false;
    }
    outWidth = static_cast<uint32_t>(w);
    outHeight = static_cast<uint32_t>(h);
    outChannels = 4;

    uint8_t* decoded = WebPDecodeRGBA(bytes, len, &w, &h);
    if (!decoded) {
        std::strncpy(outErr, "WebP decode failed", outErrLen - 1);
        return false;
    }
    const size_t bufSize = static_cast<size_t>(outWidth) * outHeight * 4;
    outData.assign(decoded, decoded + bufSize);
    WebPFree(decoded);
    return true;
}

// ─── JPEG encode ───────────────────────────────────────────────────────────
// Output is RGB only; encoders that need RGBA input get the alpha channel
// silently dropped (JPEG has no alpha). Quality clamped to [1, 100].

bool encodeJpegBytes(
    const uint8_t* pixels, uint32_t width, uint32_t height, uint32_t channels,
    int quality, std::vector<uint8_t>& outData,
    char* outErr, size_t outErrLen)
{
    if (channels != 3 && channels != 4) {
        std::snprintf(outErr, outErrLen, "JPEG encode requires 3- or 4-channel input, got %u", channels);
        return false;
    }
    struct jpeg_compress_struct cinfo;
    JpegError jerr;
    cinfo.err = jpeg_std_error(&jerr.pub);
    jerr.pub.error_exit = jpegErrorExit;
    jerr.pub.output_message = jpegOutputMessage;
    jerr.message[0] = '\0';

    unsigned char* outBuf = nullptr;
    unsigned long outBufLen = 0;

    if (setjmp(jerr.jbuf)) {
        if (outBuf) std::free(outBuf);
        jpeg_destroy_compress(&cinfo);
        std::strncpy(outErr, jerr.message[0] ? jerr.message : "JPEG encode failed", outErrLen - 1);
        outErr[outErrLen - 1] = '\0';
        return false;
    }

    jpeg_create_compress(&cinfo);
    // jpeg_mem_dest mallocs and grows outBuf; we copy out and free below.
    jpeg_mem_dest(&cinfo, &outBuf, &outBufLen);
    cinfo.image_width = width;
    cinfo.image_height = height;
    cinfo.input_components = 3;
    cinfo.in_color_space = JCS_RGB;
    jpeg_set_defaults(&cinfo);
    int q = quality;
    if (q < 1) q = 1;
    if (q > 100) q = 100;
    jpeg_set_quality(&cinfo, q, TRUE);
    jpeg_start_compress(&cinfo, TRUE);

    if (channels == 3) {
        // Direct path — pass scanlines into libjpeg as-is.
        const size_t rowBytes = static_cast<size_t>(width) * 3;
        while (cinfo.next_scanline < height) {
            JSAMPROW row[1] = {
                const_cast<uint8_t*>(pixels) + static_cast<size_t>(cinfo.next_scanline) * rowBytes,
            };
            jpeg_write_scanlines(&cinfo, row, 1);
        }
    } else {
        // RGBA → RGB drop the alpha into a per-row scratch buffer.
        std::vector<uint8_t> rowScratch(static_cast<size_t>(width) * 3);
        const size_t inRowBytes = static_cast<size_t>(width) * 4;
        while (cinfo.next_scanline < height) {
            const uint8_t* src = pixels + static_cast<size_t>(cinfo.next_scanline) * inRowBytes;
            for (uint32_t x = 0; x < width; x++) {
                rowScratch[x * 3] = src[x * 4];
                rowScratch[x * 3 + 1] = src[x * 4 + 1];
                rowScratch[x * 3 + 2] = src[x * 4 + 2];
            }
            JSAMPROW row[1] = { rowScratch.data() };
            jpeg_write_scanlines(&cinfo, row, 1);
        }
    }

    jpeg_finish_compress(&cinfo);
    outData.assign(outBuf, outBuf + outBufLen);
    std::free(outBuf);
    jpeg_destroy_compress(&cinfo);
    return true;
}

// ─── WebP encode ───────────────────────────────────────────────────────────
// libwebp's one-shot encoders take pixel data + dims + quality and malloc
// an output buffer. Quality applies to lossy mode only; lossless uses a
// separate API. RGB and RGBA paths are also separate functions in libwebp.

bool encodeWebPBytes(
    const uint8_t* pixels, uint32_t width, uint32_t height, uint32_t channels,
    int quality, bool lossless, std::vector<uint8_t>& outData,
    char* outErr, size_t outErrLen)
{
    if (channels != 3 && channels != 4) {
        std::snprintf(outErr, outErrLen, "WebP encode requires 3- or 4-channel input, got %u", channels);
        return false;
    }
    const int stride = static_cast<int>(width) * static_cast<int>(channels);
    uint8_t* out = nullptr;
    size_t outSize = 0;
    if (lossless) {
        outSize = (channels == 4)
            ? WebPEncodeLosslessRGBA(pixels, width, height, stride, &out)
            : WebPEncodeLosslessRGB(pixels, width, height, stride, &out);
    } else {
        const float q = static_cast<float>(quality < 1 ? 1 : quality > 100 ? 100 : quality);
        outSize = (channels == 4)
            ? WebPEncodeRGBA(pixels, width, height, stride, q, &out)
            : WebPEncodeRGB(pixels, width, height, stride, q, &out);
    }
    if (outSize == 0 || !out) {
        std::strncpy(outErr, "WebP encode failed", outErrLen - 1);
        outErr[outErrLen - 1] = '\0';
        if (out) WebPFree(out);
        return false;
    }
    outData.assign(out, out + outSize);
    WebPFree(out);
    return true;
}

// ─── Lanczos resize ────────────────────────────────────────────────────────
// Windowed-sinc resampling — the de-facto standard for high-quality
// image scaling (Pillow, ImageMagick, GIMP all default to it for
// downsampling). Sharper than bilinear at edges, especially when
// shrinking; preserves more detail at the cost of running ~3-4× the
// per-pixel ops. Separable: a horizontal 1D Lanczos pass followed by
// a vertical one, both with the same kernel.

namespace {

float sinc(float x)
{
    if (std::abs(x) < 1e-7f) return 1.0f;
    const float pix = static_cast<float>(M_PI) * x;
    return std::sin(pix) / pix;
}

// Lanczos kernel: L(x) = sinc(x) * sinc(x/a) for |x| < a, else 0.
// `a` (radius) = 3 gives the widely-used Lanczos-3.
float lanczosWeight(float x, int a)
{
    if (x < 0) x = -x;
    if (x >= static_cast<float>(a)) return 0.0f;
    return sinc(x) * sinc(x / static_cast<float>(a));
}

// Pre-computed per-output-column weights. For a fixed scale ratio, every
// output column samples the same set of input columns relative to its
// center. Pre-computing avoids re-evaluating sinc per pixel.
struct LanczosTaps {
    int a;
    int outW;
    std::vector<int> firstSource; // outW entries — first source col for each output col
    std::vector<int> tapCount;    // outW entries — how many sources contribute
    std::vector<int> tapOffset;   // outW entries — prefix-sum of tapCount; weights[tapOffset[i]..] is row i's slice
    std::vector<float> weights;   // flattened, sum(tapCount) entries
};

LanczosTaps buildLanczosTaps(uint32_t inLen, uint32_t outLen, int radius)
{
    LanczosTaps t;
    t.a = radius;
    t.outW = static_cast<int>(outLen);
    t.firstSource.resize(outLen);
    t.tapCount.resize(outLen);
    t.tapOffset.resize(outLen);
    const float ratio = static_cast<float>(inLen) / static_cast<float>(outLen);
    // Down-scaling case: stretch the kernel by `ratio` so it averages over
    // the larger input footprint. Up-scaling uses ratio = 1 (kernel
    // operates on integer-spaced input pixels directly).
    const float filterScale = (outLen < inLen) ? ratio : 1.0f;
    const float invFilterScale = 1.0f / filterScale;
    const float support = static_cast<float>(radius) * filterScale;

    for (uint32_t o = 0; o < outLen; o++) {
        const float center = (static_cast<float>(o) + 0.5f) * ratio - 0.5f;
        int first = static_cast<int>(std::ceil(center - support));
        int last = static_cast<int>(std::floor(center + support));
        if (first < 0) first = 0;
        if (last >= static_cast<int>(inLen)) last = static_cast<int>(inLen) - 1;
        const int n = std::max(0, last - first + 1);

        float sum = 0;
        std::vector<float> ws(n);
        for (int i = 0; i < n; i++) {
            const float x = (static_cast<float>(first + i) - center) * invFilterScale;
            ws[i] = lanczosWeight(x, radius);
            sum += ws[i];
        }
        // Normalize so the kernel has unit DC gain — keeps brightness stable.
        if (sum != 0) {
            for (int i = 0; i < n; i++) ws[i] /= sum;
        }

        t.firstSource[o] = first;
        t.tapCount[o] = n;
        t.tapOffset[o] = static_cast<int>(t.weights.size());
        for (int i = 0; i < n; i++) t.weights.push_back(ws[i]);
    }
    return t;
}

} // anonymous namespace

void resizeLanczos(
    const uint8_t* src, uint32_t sw, uint32_t sh, uint32_t channels,
    uint8_t* dst, uint32_t dw, uint32_t dh, int radius = 3)
{
    // Pass 1: horizontal — produces a dw × sh × channels float buffer.
    // We use float for the intermediate so summing many low-weight taps
    // doesn't lose precision through repeated 0..255 clamps.
    LanczosTaps hT = buildLanczosTaps(sw, dw, radius);
    std::vector<float> mid(static_cast<size_t>(dw) * sh * channels);
    // Average taps per output column for the cost estimate.
    const size_t hCost = static_cast<size_t>(dw) * sh * channels * radius * 2;
    parallelRows(sh, hCost, [&](uint32_t y0, uint32_t y1) {
        for (uint32_t oy = y0; oy < y1; oy++) {
            const uint8_t* srcRow = src + static_cast<size_t>(oy) * sw * channels;
            float* midRow = mid.data() + static_cast<size_t>(oy) * dw * channels;
            for (uint32_t ox = 0; ox < dw; ox++) {
                const int first = hT.firstSource[ox];
                const int n = hT.tapCount[ox];
                const float* w = hT.weights.data() + hT.tapOffset[ox];
                for (uint32_t c = 0; c < channels; c++) {
                    float acc = 0;
                    for (int i = 0; i < n; i++) {
                        acc += static_cast<float>(srcRow[(first + i) * channels + c]) * w[i];
                    }
                    midRow[ox * channels + c] = acc;
                }
            }
        }
    });

    // Pass 2: vertical — turns dw × sh into dw × dh. Same row-parallel split.
    LanczosTaps vT = buildLanczosTaps(sh, dh, radius);
    const size_t vCost = static_cast<size_t>(dw) * dh * channels * radius * 2;
    parallelRows(dh, vCost, [&](uint32_t y0, uint32_t y1) {
        for (uint32_t oy = y0; oy < y1; oy++) {
            const int first = vT.firstSource[oy];
            const int n = vT.tapCount[oy];
            const float* w = vT.weights.data() + vT.tapOffset[oy];
            uint8_t* dstRow = dst + static_cast<size_t>(oy) * dw * channels;
            for (uint32_t ox = 0; ox < dw; ox++) {
                for (uint32_t c = 0; c < channels; c++) {
                    float acc = 0;
                    for (int i = 0; i < n; i++) {
                        const float* midRow = mid.data() + static_cast<size_t>(first + i) * dw * channels;
                        acc += midRow[ox * channels + c] * w[i];
                    }
                    int rounded = static_cast<int>(acc + 0.5f);
                    if (rounded < 0) rounded = 0;
                    if (rounded > 255) rounded = 255;
                    dstRow[ox * channels + c] = static_cast<uint8_t>(rounded);
                }
            }
        }
    });
}

// ─── Gaussian blur ─────────────────────────────────────────────────────────
// Separable 1D Gaussian: horizontal pass into a float intermediate, then
// vertical pass into the output buffer. σ is derived from the user-facing
// radius parameter (matches the CSS / Pillow convention: radius is the
// pixel-distance over which the kernel covers ~3σ of weight).
//
// Border handling: clamp-to-edge replication. For a 5-pixel-radius blur
// at the corner pixel, sources beyond the image edge re-use the edge
// pixel value. Most photo-blur use cases want this; for pure mathematical
// "zero outside" semantics, callers can pad first.

namespace {

void buildGaussianKernel1D(int radius, std::vector<float>& kernel)
{
    const int size = 2 * radius + 1;
    kernel.resize(size);
    const float sigma = static_cast<float>(radius) / 3.0f + 1e-6f;
    const float invTwoSigmaSq = 1.0f / (2.0f * sigma * sigma);
    float sum = 0.0f;
    for (int i = 0; i < size; i++) {
        const float x = static_cast<float>(i - radius);
        kernel[i] = std::exp(-x * x * invTwoSigmaSq);
        sum += kernel[i];
    }
    // Normalize to unit DC gain — output brightness matches input.
    const float invSum = 1.0f / sum;
    for (int i = 0; i < size; i++) kernel[i] *= invSum;
}

} // anonymous namespace

void gaussianBlur(
    const uint8_t* src, uint32_t w, uint32_t h, uint32_t channels,
    uint8_t* dst, int radius)
{
    if (radius <= 0) {
        // Identity — copy through.
        std::memcpy(dst, src, static_cast<size_t>(w) * h * channels);
        return;
    }

    std::vector<float> kernel;
    buildGaussianKernel1D(radius, kernel);
    const float* __restrict__ kPtr = kernel.data();
    const int kSize = 2 * radius + 1;

    // Pass 1: horizontal blur, src → mid (float). The interior columns
    // [radius, w - radius) need no bounds-checking — split that region
    // off so its inner loop is a simple multiply-accumulate the compiler
    // can auto-vectorize. Edges stay scalar with clamping.
    std::vector<float> mid(static_cast<size_t>(w) * h * channels);
    const size_t pass1Cost = static_cast<size_t>(w) * h * channels * kSize;
    const int wi = static_cast<int>(w);
    const int interiorStart = std::min(radius, wi);
    const int interiorEnd = std::max(wi - radius, interiorStart);

    parallelRows(h, pass1Cost, [&](uint32_t y0, uint32_t y1) {
        for (uint32_t y = y0; y < y1; y++) {
            const uint8_t* __restrict__ srcRow = src + static_cast<size_t>(y) * w * channels;
            float* __restrict__ midRow = mid.data() + static_cast<size_t>(y) * w * channels;

            // Left edge — needs clamping.
            for (int x = 0; x < interiorStart; x++) {
                for (uint32_t c = 0; c < channels; c++) {
                    float acc = 0.0f;
                    for (int k = -radius; k <= radius; k++) {
                        int sx = x + k;
                        if (sx < 0) sx = 0;
                        if (sx >= wi) sx = wi - 1;
                        acc += static_cast<float>(srcRow[sx * channels + c]) * kPtr[k + radius];
                    }
                    midRow[x * channels + c] = acc;
                }
            }

            // Interior — no clamping.
            //
            // For channels == 4 we hand-roll a 4-lane SIMD inner loop:
            // load one RGBA pixel (4 bytes) per tap as a single i32,
            // expand to 4 floats, broadcast the kernel weight, FMA
            // into a 4-lane accumulator. This collapses what was 4
            // scalar accumulator chains in the C++ into a single
            // SIMD FMA per tap. SSE2 + FMA on x86 (Haswell+ via AVX2),
            // NEON on ARM64.
            if (channels == 4) {
#if defined(PB_HAVE_X86_SIMD)
                // AVX2 path: process 2 RGBA output pixels per iteration.
                // Adjacent output pixels x and x+1 sample input bytes that
                // are exactly 4 apart (one pixel offset), so a single 8-byte
                // load at base + i*4 picks up both pixels' tap-i contribution.
                // Expand u8×8 → i32×8 → f32×8, multiply by broadcast kernel
                // weight, FMA into a 256-bit accumulator. Each iteration
                // does 2× the work of the SSE 128-bit path.
                int x = interiorStart;
                const int avx2End = interiorEnd - ((interiorEnd - interiorStart) & 1);
                for (; x < avx2End; x += 2) {
                    const uint8_t* base = srcRow + (x - radius) * 4;
                    __m256 acc = _mm256_setzero_ps();
                    for (int i = 0; i < kSize; i++) {
                        __m128i b = _mm_loadl_epi64(reinterpret_cast<const __m128i*>(base + i * 4));
                        __m256i ext = _mm256_cvtepu8_epi32(b);
                        __m256 pf = _mm256_cvtepi32_ps(ext);
                        __m256 wf = _mm256_set1_ps(kPtr[i]);
                        acc = _mm256_fmadd_ps(pf, wf, acc);
                    }
                    _mm256_storeu_ps(midRow + x * 4, acc);
                }
                // Tail (interior is odd-length): handle the last pixel via
                // the SSE path. interior is at most 1 pixel here.
                for (; x < interiorEnd; x++) {
                    const uint8_t* base = srcRow + (x - radius) * 4;
                    __m128 acc = _mm_setzero_ps();
                    for (int i = 0; i < kSize; i++) {
                        __m128i b = _mm_cvtsi32_si128(*reinterpret_cast<const int32_t*>(base + i * 4));
                        __m128i ext = _mm_cvtepu8_epi32(b);
                        __m128 pf = _mm_cvtepi32_ps(ext);
                        __m128 wf = _mm_set1_ps(kPtr[i]);
                        acc = _mm_fmadd_ps(pf, wf, acc);
                    }
                    _mm_storeu_ps(midRow + x * 4, acc);
                }
#elif defined(PB_HAVE_NEON)
                for (int x = interiorStart; x < interiorEnd; x++) {
                    const uint8_t* base = srcRow + (x - radius) * 4;
                    float32x4_t acc = vdupq_n_f32(0.0f);
                    for (int i = 0; i < kSize; i++) {
                        // Load 4 bytes, widen u8→u16→u32, convert to f32.
                        uint8x8_t b8 = vld1_u8(base + i * 4); // loads 8, we use the low 4
                        uint16x8_t b16 = vmovl_u8(b8);
                        uint32x4_t b32 = vmovl_u16(vget_low_u16(b16));
                        float32x4_t pf = vcvtq_f32_u32(b32);
                        float32x4_t wf = vdupq_n_f32(kPtr[i]);
                        acc = vfmaq_f32(acc, pf, wf);
                    }
                    vst1q_f32(midRow + x * 4, acc);
                }
#else
                // Pure-scalar fallback (no SIMD intrinsics available).
                for (int x = interiorStart; x < interiorEnd; x++) {
                    const uint8_t* base = srcRow + (x - radius) * 4;
                    for (uint32_t c = 0; c < 4u; c++) {
                        float acc = 0.0f;
                        for (int i = 0; i < kSize; i++) acc += static_cast<float>(base[i * 4 + c]) * kPtr[i];
                        midRow[x * 4 + c] = acc;
                    }
                }
#endif
            } else {
                // Generic fallback for channels != 4 (1 or 3).
                for (int x = interiorStart; x < interiorEnd; x++) {
                    const uint8_t* base = srcRow + (x - radius) * static_cast<int>(channels);
                    for (uint32_t c = 0; c < channels; c++) {
                        float acc = 0.0f;
                        for (int i = 0; i < kSize; i++) {
                            acc += static_cast<float>(base[i * static_cast<int>(channels) + c]) * kPtr[i];
                        }
                        midRow[x * channels + c] = acc;
                    }
                }
            }

            // Right edge.
            for (int x = interiorEnd; x < wi; x++) {
                for (uint32_t c = 0; c < channels; c++) {
                    float acc = 0.0f;
                    for (int k = -radius; k <= radius; k++) {
                        int sx = x + k;
                        if (sx < 0) sx = 0;
                        if (sx >= wi) sx = wi - 1;
                        acc += static_cast<float>(srcRow[sx * channels + c]) * kPtr[k + radius];
                    }
                    midRow[x * channels + c] = acc;
                }
            }
        }
    });

    // Pass 2: vertical blur, mid → dst (uint8 with clamp). Same edge /
    // interior split, this time over y. Interior is a multiply-accumulate
    // along contiguous-in-y mid rows; per-row stride is `w * channels`.
    const int hi = static_cast<int>(h);
    const int yInteriorStart = std::min(radius, hi);
    const int yInteriorEnd = std::max(hi - radius, yInteriorStart);

    parallelRows(h, pass1Cost, [&](uint32_t y0, uint32_t y1) {
        for (uint32_t yu = y0; yu < y1; yu++) {
            const int y = static_cast<int>(yu);
            uint8_t* __restrict__ dstRow = dst + static_cast<size_t>(y) * w * channels;
            const bool clamping = (y < yInteriorStart) || (y >= yInteriorEnd);
            if (clamping) {
                for (uint32_t x = 0; x < w; x++) {
                    for (uint32_t c = 0; c < channels; c++) {
                        float acc = 0.0f;
                        for (int k = -radius; k <= radius; k++) {
                            int sy = y + k;
                            if (sy < 0) sy = 0;
                            if (sy >= hi) sy = hi - 1;
                            const float* midRow = mid.data() + static_cast<size_t>(sy) * w * channels;
                            acc += midRow[x * channels + c] * kPtr[k + radius];
                        }
                        int rounded = static_cast<int>(acc + 0.5f);
                        if (rounded < 0) rounded = 0;
                        if (rounded > 255) rounded = 255;
                        dstRow[x * channels + c] = static_cast<uint8_t>(rounded);
                    }
                }
            } else {
                // Interior — pre-fetch the kSize row pointers once,
                // then multiply-accumulate without per-pixel bound checks.
                // radius is bounded to [0, 100] by the host fn so kSize ≤ 201.
                std::vector<const float*> rows(kSize);
                for (int i = 0; i < kSize; i++) {
                    rows[i] = mid.data() + static_cast<size_t>(y - radius + i) * w * channels;
                }

                if (channels == 4) {
#if defined(PB_HAVE_X86_SIMD)
                    // AVX2 path: 2 RGBA pixels per iteration (8 floats).
                    // The float-intermediate is contiguous so a single
                    // 256-bit load gets both pixels' tap-i values for free.
                    uint32_t x = 0;
                    const uint32_t avx2End = w & ~1u;
                    for (; x < avx2End; x += 2) {
                        const size_t off = static_cast<size_t>(x) * 4;
                        __m256 acc = _mm256_setzero_ps();
                        for (int i = 0; i < kSize; i++) {
                            __m256 pf = _mm256_loadu_ps(rows[i] + off);
                            __m256 wf = _mm256_set1_ps(kPtr[i]);
                            acc = _mm256_fmadd_ps(pf, wf, acc);
                        }
                        // Round-to-nearest, clamp [0, 255], pack 8 i32 → 8 u8.
                        __m256i ri = _mm256_cvttps_epi32(_mm256_add_ps(acc, _mm256_set1_ps(0.5f)));
                        __m256i clamped = _mm256_min_epi32(
                            _mm256_set1_epi32(255), _mm256_max_epi32(_mm256_setzero_si256(), ri));
                        // packus_epi32 is per-128-bit-lane; produces
                        // [low4, low4_dup, high4, high4_dup] in i16 lanes.
                        __m256i p16 = _mm256_packus_epi32(clamped, clamped);
                        // packus_epi16 same lane behavior — yields i8 lanes
                        // [low8 lo, low8 dup, high8 lo, high8 dup].
                        __m256i p8 = _mm256_packus_epi16(p16, p16);
                        // permute4x64 to gather lanes 0 (low) and 2 (high)
                        // into the bottom 64 bits — yields linear 8-byte sequence.
                        __m256i perm = _mm256_permute4x64_epi64(p8, 0b00001000);
                        _mm_storel_epi64(reinterpret_cast<__m128i*>(dstRow + off),
                                         _mm256_castsi256_si128(perm));
                    }
                    // Tail (w odd): one last pixel via SSE.
                    for (; x < w; x++) {
                        const size_t off = static_cast<size_t>(x) * 4;
                        __m128 acc = _mm_setzero_ps();
                        for (int i = 0; i < kSize; i++) {
                            __m128 pf = _mm_loadu_ps(rows[i] + off);
                            __m128 wf = _mm_set1_ps(kPtr[i]);
                            acc = _mm_fmadd_ps(pf, wf, acc);
                        }
                        __m128i ri = _mm_cvttps_epi32(_mm_add_ps(acc, _mm_set1_ps(0.5f)));
                        __m128i clamped = _mm_min_epi32(_mm_set1_epi32(255), _mm_max_epi32(_mm_setzero_si128(), ri));
                        __m128i p16 = _mm_packus_epi32(clamped, clamped);
                        __m128i p8 = _mm_packus_epi16(p16, p16);
                        *reinterpret_cast<int32_t*>(dstRow + off) = _mm_cvtsi128_si32(p8);
                    }
#elif defined(PB_HAVE_NEON)
                    for (uint32_t x = 0; x < w; x++) {
                        const size_t off = static_cast<size_t>(x) * 4;
                        float32x4_t acc = vdupq_n_f32(0.0f);
                        for (int i = 0; i < kSize; i++) {
                            float32x4_t pf = vld1q_f32(rows[i] + off);
                            float32x4_t wf = vdupq_n_f32(kPtr[i]);
                            acc = vfmaq_f32(acc, pf, wf);
                        }
                        // Round-to-nearest, clamp, pack to u8x4.
                        uint32x4_t u32 = vcvtnq_u32_f32(acc);
                        uint16x4_t u16 = vqmovn_u32(u32);
                        uint8x8_t u8 = vqmovn_u16(vcombine_u16(u16, u16));
                        // Store the low 4 bytes.
                        vst1_lane_u32(reinterpret_cast<uint32_t*>(dstRow + off),
                                      vreinterpret_u32_u8(u8), 0);
                    }
#else
                    for (uint32_t x = 0; x < w; x++) {
                        for (uint32_t c = 0; c < 4u; c++) {
                            float acc = 0.0f;
                            for (int i = 0; i < kSize; i++) acc += rows[i][x * 4 + c] * kPtr[i];
                            int rounded = static_cast<int>(acc + 0.5f);
                            if (rounded < 0) rounded = 0;
                            if (rounded > 255) rounded = 255;
                            dstRow[x * 4 + c] = static_cast<uint8_t>(rounded);
                        }
                    }
#endif
                } else {
                    // Generic fallback for channels != 4 (1 or 3).
                    for (uint32_t x = 0; x < w; x++) {
                        for (uint32_t c = 0; c < channels; c++) {
                            float acc = 0.0f;
                            for (int i = 0; i < kSize; i++) {
                                acc += rows[i][x * channels + c] * kPtr[i];
                            }
                            int rounded = static_cast<int>(acc + 0.5f);
                            if (rounded < 0) rounded = 0;
                            if (rounded > 255) rounded = 255;
                            dstRow[x * channels + c] = static_cast<uint8_t>(rounded);
                        }
                    }
                }
            }
        }
    });
}

// ─── Box blur via summed-area tables ─────────────────────────────────────
// Builds a per-channel summed-area table (integral image) once, then
// answers the (2r+1)² box-sum at each output pixel in O(1) via four
// SAT lookups. The whole op is O(W·H) regardless of radius — Sharp /
// libvips's separable Gaussian scales as O(W·H·radius), so this wins
// dominantly once the kernel grows. At radius=20 we expect ~10-20×
// over Sharp; at radius=5 it's still 2-4×. Visual result is a uniform-
// weighted box average (not a true Gaussian), which is fine for soft
// blur effects but not for blur-then-subtract operations like
// unsharp-mask. Callers who need a Gaussian use image.blur instead.
//
// SAT element type: u32 here. Risk is overflow at extreme image sizes —
// max value across the full SAT is 255·W·H, which exceeds 2^32 only
// for white images >= 16384² pixels. For realistic photo content
// (mean luma ≈ 128) the headroom is 2× larger.

void boxBlurRGBA(
    const uint8_t* src, uint32_t w, uint32_t h, uint8_t* dst, int radius)
{
    const uint32_t sw = w + 1;
    const uint32_t sh = h + 1;
    const size_t satElems = static_cast<size_t>(sw) * sh;
    // One scratch SAT, reused across the four channels.
    std::vector<uint32_t> sat(satElems);

    for (uint32_t c = 0; c < 4; c++) {
        // Build SAT — row prefix-sum then column prefix-sum, single
        // pass each (row j depends on row j-1's column-prefix output).
        std::memset(sat.data(), 0, satElems * sizeof(uint32_t));
        for (uint32_t y = 0; y < h; y++) {
            uint32_t rowSum = 0;
            const uint8_t* srcRow = src + static_cast<size_t>(y) * w * 4 + c;
            uint32_t* satRow = sat.data() + static_cast<size_t>(y + 1) * sw + 1;
            const uint32_t* satRowAbove = sat.data() + static_cast<size_t>(y) * sw + 1;
            for (uint32_t x = 0; x < w; x++) {
                rowSum += srcRow[x * 4];
                satRow[x] = satRowAbove[x] + rowSum;
            }
        }

        // Apply the box average. Output rows are independent → parallel.
        const size_t cost = static_cast<size_t>(w) * h * 4;
        parallelRows(h, cost, [&](uint32_t y0, uint32_t y1) {
            for (uint32_t y = y0; y < y1; y++) {
                const int32_t yi = static_cast<int32_t>(y);
                const int32_t y1c = std::max(0, yi - radius);
                const int32_t y2c = std::min(static_cast<int32_t>(h) - 1, yi + radius);
                const uint32_t* satY2 = sat.data() + static_cast<size_t>(y2c + 1) * sw;
                const uint32_t* satY1 = sat.data() + static_cast<size_t>(y1c) * sw;
                const int32_t yCount = y2c - y1c + 1;
                uint8_t* dstRow = dst + static_cast<size_t>(y) * w * 4 + c;
                for (uint32_t x = 0; x < w; x++) {
                    const int32_t xi = static_cast<int32_t>(x);
                    const int32_t x1c = std::max(0, xi - radius);
                    const int32_t x2c = std::min(static_cast<int32_t>(w) - 1, xi + radius);
                    const uint32_t sum = satY2[x2c + 1] - satY1[x2c + 1] - satY2[x1c] + satY1[x1c];
                    const int32_t count = yCount * (x2c - x1c + 1);
                    // Round-to-nearest for the integer divide.
                    dstRow[x * 4] = static_cast<uint8_t>((sum + count / 2) / count);
                }
            }
        });
    }
}

// ─── Unsharp-mask sharpen ──────────────────────────────────────────────────
// Standard formulation:  sharpened = input + (input − blur(input)) × amount
// — extract the high-frequency detail by subtracting a low-pass copy, then
// scale and add it back. amount=1 doubles the high-frequency content;
// amount=0.5 is subtle; amount=2+ is aggressive. radius controls the
// Gaussian half-width — small radius (1-3) catches fine detail, larger
// radius catches broader features.

void unsharpSharpen(
    const uint8_t* src, uint32_t w, uint32_t h, uint32_t channels,
    uint8_t* dst, int radius, float amount)
{
    // Compute a blur into a scratch buffer first.
    std::vector<uint8_t> blurred(static_cast<size_t>(w) * h * channels);
    gaussianBlur(src, w, h, channels, blurred.data(), radius);

    // sharpened = src + amount × (src − blurred), clamped to [0, 255].
    // For RGBA inputs we leave alpha untouched — sharpening alpha is
    // never what callers want. Per-row split across threads.
    const size_t cost = static_cast<size_t>(w) * h * channels;
    parallelRows(h, cost, [&](uint32_t y0, uint32_t y1) {
        for (uint32_t y = y0; y < y1; y++) {
            const size_t rowStart = static_cast<size_t>(y) * w * channels;
            const size_t rowEnd = rowStart + static_cast<size_t>(w) * channels;
            for (size_t i = rowStart; i < rowEnd; i++) {
                const uint32_t c = static_cast<uint32_t>(i % channels);
                if (channels == 4 && c == 3) {
                    dst[i] = src[i];
                    continue;
                }
                const float diff = static_cast<float>(src[i]) - static_cast<float>(blurred[i]);
                const float v = static_cast<float>(src[i]) + amount * diff;
                int rounded = static_cast<int>(v + 0.5f);
                if (rounded < 0) rounded = 0;
                if (rounded > 255) rounded = 255;
                dst[i] = static_cast<uint8_t>(rounded);
            }
        }
    });
}

// ─── Fill rectangle (solid color) ─────────────────────────────────────────
// Paint a solid-color rectangle into a copy of the input. The simplest
// 2D drawing primitive — useful for masking, backdrops behind composited
// overlays, debug visualizations, and as a building block for fancier
// drawing on top.
//
// `color` is given per-channel as a uint8_t array whose length matches
// the source image's channel count. Out-of-bounds rectangles silently
// clip to the source bounds (matching composite()'s semantics).

void fillRect(
    const uint8_t* src, uint32_t w, uint32_t h, uint32_t channels,
    uint8_t* dst,
    int32_t rx, int32_t ry, uint32_t rw, uint32_t rh,
    const uint8_t* color)
{
    // Copy base → dst, then overwrite the clipped rectangle.
    std::memcpy(dst, src, static_cast<size_t>(w) * h * channels);
    const int32_t startX = std::max(rx, 0);
    const int32_t startY = std::max(ry, 0);
    const int32_t endX = std::min(rx + static_cast<int32_t>(rw), static_cast<int32_t>(w));
    const int32_t endY = std::min(ry + static_cast<int32_t>(rh), static_cast<int32_t>(h));
    if (startX >= endX || startY >= endY) return;

    for (int32_t y = startY; y < endY; y++) {
        uint8_t* row = dst + (static_cast<size_t>(y) * w + startX) * channels;
        for (int32_t x = startX; x < endX; x++) {
            for (uint32_t c = 0; c < channels; c++) row[c] = color[c];
            row += channels;
        }
    }
}

// ─── Composite (alpha blending) ───────────────────────────────────────────
// Porter-Duff "source over" alpha compositing: paste an overlay onto a
// base at a given (x, y), respecting alpha. Base + overlay can each be
// 3- or 4-channel. The output matches base's channel count.
//
// Channel-mix matrix:
//   base RGBA + overlay RGBA → full alpha blend, output RGBA
//   base RGBA + overlay RGB  → overlay treated as opaque (alpha = 255)
//   base RGB  + overlay RGBA → blend, drop alpha at output
//   base RGB  + overlay RGB  → overlay replaces base in the region
//
// Assumes UNassociated alpha (RGB stored as the un-multiplied color, alpha
// kept separate) — matches PNG and what every common image library uses.
//
// Out-of-bounds regions are silently clipped (an overlay placed at
// x = base.width - 2 with overlay.width = 10 just composites the leftmost
// 2 columns; the rest is dropped).

void compositeOver(
    const uint8_t* baseSrc, uint32_t bw, uint32_t bh, uint32_t bChannels,
    const uint8_t* overlay, uint32_t ow, uint32_t oh, uint32_t oChannels,
    uint8_t* dst /* bw × bh × bChannels */,
    int32_t px, int32_t py)
{
    // First copy base → dst untouched. Overlay then writes only into the
    // intersected region.
    std::memcpy(dst, baseSrc, static_cast<size_t>(bw) * bh * bChannels);

    // Compute the intersection of the overlay rectangle with the base.
    const int32_t startX = std::max(px, 0);
    const int32_t startY = std::max(py, 0);
    const int32_t endX = std::min(px + static_cast<int32_t>(ow), static_cast<int32_t>(bw));
    const int32_t endY = std::min(py + static_cast<int32_t>(oh), static_cast<int32_t>(bh));
    if (startX >= endX || startY >= endY) return;

    const bool overlayHasAlpha = (oChannels == 4);
    const bool baseHasAlpha = (bChannels == 4);

    for (int32_t y = startY; y < endY; y++) {
        const int32_t oy = y - py;
        for (int32_t x = startX; x < endX; x++) {
            const int32_t ox = x - px;
            const size_t srcIdx = (static_cast<size_t>(oy) * ow + ox) * oChannels;
            const size_t dstIdx = (static_cast<size_t>(y) * bw + x) * bChannels;

            const float srcA = overlayHasAlpha ? (overlay[srcIdx + 3] / 255.0f) : 1.0f;
            const float dstA = baseHasAlpha ? (dst[dstIdx + 3] / 255.0f) : 1.0f;
            const float invSrcA = 1.0f - srcA;
            // out_a = src_a + dst_a * (1 - src_a)
            const float outA = srcA + dstA * invSrcA;

            // Fully transparent overlay pixel = no change. Skip rather
            // than dividing by a tiny outA.
            if (outA == 0.0f) continue;

            for (uint32_t c = 0; c < 3; c++) {
                const float src = overlay[srcIdx + c];
                const float dstC = dst[dstIdx + c];
                // Unassociated-alpha source-over:
                // out = (src * srcA + dst * dstA * (1 - srcA)) / outA
                const float v = (src * srcA + dstC * dstA * invSrcA) / outA;
                int rounded = static_cast<int>(v + 0.5f);
                if (rounded < 0) rounded = 0;
                if (rounded > 255) rounded = 255;
                dst[dstIdx + c] = static_cast<uint8_t>(rounded);
            }
            if (baseHasAlpha) {
                int rounded = static_cast<int>(outA * 255.0f + 0.5f);
                if (rounded < 0) rounded = 0;
                if (rounded > 255) rounded = 255;
                dst[dstIdx + 3] = static_cast<uint8_t>(rounded);
            }
        }
    }
}

// ─── Invert ────────────────────────────────────────────────────────────────
// Per-channel `255 - x` on the color channels. Alpha is passed through
// untouched on RGBA — inverting alpha would conflate "negative image"
// with "swap transparent and opaque" which is rarely what callers want.
//
// Useful for negative effects, CV preprocessing where dark = signal,
// and quick mask inversions on grayscale images.

void invertImage(
    const uint8_t* src, uint32_t w, uint32_t h, uint32_t channels, uint8_t* dst)
{
    const size_t cost = static_cast<size_t>(w) * h * channels;
    parallelRows(h, cost, [&](uint32_t y0, uint32_t y1) {
        for (uint32_t y = y0; y < y1; y++) {
            const size_t base = static_cast<size_t>(y) * w * channels;
            for (uint32_t x = 0; x < w; x++) {
                for (uint32_t c = 0; c < channels; c++) {
                    const size_t idx = base + x * channels + c;
                    if (channels == 4 && c == 3) {
                        dst[idx] = src[idx];
                    } else {
                        dst[idx] = static_cast<uint8_t>(255 - src[idx]);
                    }
                }
            }
        }
    });
}

// ─── Threshold (binarize via luma) ────────────────────────────────────────
// Collapse the input to grayscale luma (Rec. 601) and binarize each pixel
// against `value`: pixels > value become 255, pixels ≤ value become 0.
// Output is always single-channel — binarization is intrinsically a
// grayscale operation, and a follow-up channel-replicate / composite
// pass can promote to RGB(A) if needed.
//
// Standard preprocessing step for OCR, blob detection, edge tracking,
// QR / barcode reading. For "best" thresholds Otsu's method derives
// `value` automatically from the histogram — that's a follow-up.

void thresholdImage(
    const uint8_t* src, uint32_t w, uint32_t h, uint32_t channels,
    uint8_t* dst /* w × h × 1 */, uint8_t value)
{
    const size_t cost = static_cast<size_t>(w) * h * channels;
    if (channels == 1) {
        parallelRows(h, cost, [&](uint32_t y0, uint32_t y1) {
            for (uint32_t y = y0; y < y1; y++) {
                const size_t base = static_cast<size_t>(y) * w;
                for (uint32_t x = 0; x < w; x++) dst[base + x] = src[base + x] > value ? 255 : 0;
            }
        });
        return;
    }
    parallelRows(h, cost, [&](uint32_t y0, uint32_t y1) {
        for (uint32_t y = y0; y < y1; y++) {
            const size_t srcBase = static_cast<size_t>(y) * w * channels;
            const size_t dstBase = static_cast<size_t>(y) * w;
            for (uint32_t x = 0; x < w; x++) {
                const float r = static_cast<float>(src[srcBase + x * channels + 0]);
                const float g = static_cast<float>(src[srcBase + x * channels + 1]);
                const float b = static_cast<float>(src[srcBase + x * channels + 2]);
                const float L = 0.299f * r + 0.587f * g + 0.114f * b;
                dst[dstBase + x] = (L > static_cast<float>(value)) ? 255 : 0;
            }
        }
    });
}

// ─── Per-channel histogram ────────────────────────────────────────────────
// 256-bin pixel-intensity histogram, one bin per 8-bit value, computed
// independently per channel. The output is `channels` separate Uint32Array
// counts in row-major channel order — R, G, B for RGB; R, G, B, A for
// RGBA; the lone channel for grayscale.
//
// Useful for exposure analysis (do we have any pure-black/pure-white
// pixels?), auto-tone curve fitting, threshold finding (Otsu's method
// derives its threshold from the channel histogram).

void perChannelHistogramCpu(
    const uint8_t* src, uint32_t w, uint32_t h, uint32_t channels,
    uint32_t* dst /* channels × 256, row-major by channel */)
{
    std::memset(dst, 0, sizeof(uint32_t) * channels * 256);
    const size_t pixels = static_cast<size_t>(w) * h;
    for (size_t i = 0; i < pixels; i++) {
        for (uint32_t c = 0; c < channels; c++) {
            const uint8_t v = src[i * channels + c];
            dst[c * 256 + v]++;
        }
    }
}

// ─── Tone adjustment (brightness / contrast / saturation) ─────────────────
// Single-pass per-pixel transform applied in this order:
//   1. contrast   — pivot around 128, scale by (1 + contrast)
//   2. brightness — additive offset of brightness * 255
//   3. saturation — lerp between Rec. 601 luma and the RGB value:
//                   saturation = -1 → grayscale, 0 → unchanged, +1 → 2× saturated
// Final values are clamped to [0, 255]. Alpha (channel 3 on RGBA) passes
// through unchanged — adjusting alpha here would conflate "make this image
// brighter" with "make this image more transparent", which is rarely what
// callers want.
//
// All three parameters have a sane no-op default of 0, so adjust() with any
// subset of them works without forcing callers to spell out the others.

void adjustToneCpu(
    const uint8_t* src, uint32_t w, uint32_t h, uint32_t channels,
    uint8_t* dst, float brightness, float contrast, float saturation)
{
    const float contrastMul = 1.0f + contrast; // -1 → flat 128, +1 → 2× contrast
    const float brightnessAdd = brightness * 255.0f;
    const float satMul = 1.0f + saturation; // -1 → fully grayscale, +1 → 2× saturated
    const size_t cost = static_cast<size_t>(w) * h * channels;

    parallelRows(h, cost, [&](uint32_t y0, uint32_t y1) {
    for (uint32_t y = y0; y < y1; y++) {
    for (uint32_t x = 0; x < w; x++) {
        const size_t i = static_cast<size_t>(y) * w + x;
        const size_t base = i * channels;
        // 1- and 3-channel inputs share most of the code; the 4-channel
        // case adds an alpha passthrough at the end.
        if (channels == 1) {
            float v = static_cast<float>(src[base]);
            v = (v - 128.0f) * contrastMul + 128.0f;
            v += brightnessAdd;
            // Saturation has no meaning on a single channel — skip the lerp.
            if (v < 0) v = 0;
            else if (v > 255) v = 255;
            dst[base] = static_cast<uint8_t>(v + 0.5f);
            continue;
        }

        float r = static_cast<float>(src[base + 0]);
        float g = static_cast<float>(src[base + 1]);
        float b = static_cast<float>(src[base + 2]);
        // Step 1+2: contrast around 128, then brightness offset.
        r = (r - 128.0f) * contrastMul + 128.0f + brightnessAdd;
        g = (g - 128.0f) * contrastMul + 128.0f + brightnessAdd;
        b = (b - 128.0f) * contrastMul + 128.0f + brightnessAdd;
        // Step 3: saturation as a lerp between luma and the RGB triple.
        // Done AFTER brightness/contrast so the post-tone-mapped color
        // space is what gets desaturated; doing it before would cause
        // negative-brightness regions to bleed odd hues.
        if (satMul != 1.0f) {
            const float L = 0.299f * r + 0.587f * g + 0.114f * b;
            r = L + (r - L) * satMul;
            g = L + (g - L) * satMul;
            b = L + (b - L) * satMul;
        }
        if (r < 0) r = 0;
        else if (r > 255) r = 255;
        if (g < 0) g = 0;
        else if (g > 255) g = 255;
        if (b < 0) b = 0;
        else if (b > 255) b = 255;
        dst[base + 0] = static_cast<uint8_t>(r + 0.5f);
        dst[base + 1] = static_cast<uint8_t>(g + 0.5f);
        dst[base + 2] = static_cast<uint8_t>(b + 0.5f);
        if (channels == 4) {
            dst[base + 3] = src[base + 3]; // alpha passthrough
        }
    }
    }
    });
}

// ─── Luma collapse (Rec. 601) ──────────────────────────────────────────────
// RGB → single-channel luminance using the standard Rec. 601 / ITU-R BT.601
// weights (0.299 R + 0.587 G + 0.114 B). Alpha is dropped for RGBA inputs;
// 1-channel input is a memcpy passthrough.
//
// These weights are the broadcast-TV default for "perceptual brightness"
// of an sRGB-ish color — slightly under-weighting blue and over-weighting
// green, matching the human eye's color sensitivity. Rec. 709 weights are
// almost identical (0.2126 / 0.7152 / 0.0722) and would be ~1 LSB different
// on an 8-bit channel, so the choice doesn't matter for image work.

void rgbToLuma(
    const uint8_t* src, uint32_t w, uint32_t h, uint32_t channels, uint8_t* dst /* w × h × 1 */)
{
    if (channels == 1) {
        std::memcpy(dst, src, static_cast<size_t>(w) * h);
        return;
    }
    const size_t cost = static_cast<size_t>(w) * h * channels;
    parallelRows(h, cost, [&](uint32_t y0, uint32_t y1) {
        for (uint32_t y = y0; y < y1; y++) {
            const size_t srcBase = static_cast<size_t>(y) * w * channels;
            const size_t dstBase = static_cast<size_t>(y) * w;
            for (uint32_t x = 0; x < w; x++) {
                const float r = static_cast<float>(src[srcBase + x * channels + 0]);
                const float g = static_cast<float>(src[srcBase + x * channels + 1]);
                const float b = static_cast<float>(src[srcBase + x * channels + 2]);
                const float L = 0.299f * r + 0.587f * g + 0.114f * b;
                dst[dstBase + x] = static_cast<uint8_t>(L + 0.5f);
            }
        }
    });
}

// ─── Sobel edge detection ──────────────────────────────────────────────────
// Returns a single-channel grayscale image with the magnitude of the
// per-pixel gradient. Operates on the luminance of the input — for RGB
// or RGBA inputs we collapse to luma first via Rec. 601 weights
// (0.299, 0.587, 0.114) which is the standard tradeoff between speed
// and visual fidelity for edge detection.
//
// 3×3 kernels:
//   Gx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
//   Gy = [[-1,-2,-1], [ 0, 0, 0], [ 1, 2, 1]]
//   magnitude = sqrt(Gx² + Gy²), clamped to 255.

void sobelEdgeDetect(
    const uint8_t* src, uint32_t w, uint32_t h, uint32_t channels,
    uint8_t* dst /* w × h × 1 */)
{
    if (w < 2 || h < 2) {
        std::memset(dst, 0, static_cast<size_t>(w) * h);
        return;
    }
    // Pass 1: collapse to grayscale luma via the shared helper.
    std::vector<uint8_t> luma(static_cast<size_t>(w) * h);
    rgbToLuma(src, w, h, channels, luma.data());

    // Pass 2: Sobel on luma. Row-parallel.
    auto at = [&luma, w, h](int x, int y) -> int {
        if (x < 0) x = 0;
        if (x >= static_cast<int>(w)) x = static_cast<int>(w) - 1;
        if (y < 0) y = 0;
        if (y >= static_cast<int>(h)) y = static_cast<int>(h) - 1;
        return luma[static_cast<size_t>(y) * w + x];
    };
    const size_t cost = static_cast<size_t>(w) * h * 9; // ~9 ops per pixel
    parallelRows(h, cost, [&](uint32_t y0, uint32_t y1) {
        for (uint32_t y = y0; y < y1; y++) {
            for (uint32_t x = 0; x < w; x++) {
                const int xi = static_cast<int>(x);
                const int yi = static_cast<int>(y);
                const int gx = -at(xi - 1, yi - 1) + at(xi + 1, yi - 1)
                    - 2 * at(xi - 1, yi) + 2 * at(xi + 1, yi)
                    - at(xi - 1, yi + 1) + at(xi + 1, yi + 1);
                const int gy = -at(xi - 1, yi - 1) - 2 * at(xi, yi - 1) - at(xi + 1, yi - 1)
                    + at(xi - 1, yi + 1) + 2 * at(xi, yi + 1) + at(xi + 1, yi + 1);
                int mag = static_cast<int>(std::sqrt(static_cast<float>(gx * gx + gy * gy)) + 0.5f);
                if (mag > 255) mag = 255;
                dst[static_cast<size_t>(y) * w + x] = static_cast<uint8_t>(mag);
            }
        }
    });
}

// ─── Geometric transforms (rotate / flip) ──────────────────────────────────
// 90/180/270° rotations and horizontal/vertical flips. These are
// memory-shuffles only — no resampling, every input pixel maps to exactly
// one output pixel. Arbitrary angles need a separate path with bilinear
// or Lanczos sampling and live elsewhere.
//
// Rotation conventions match every other image library: 90 = clockwise.

void rotate90Clockwise(
    const uint8_t* src, uint32_t sw, uint32_t sh, uint32_t channels, uint8_t* dst /* sh × sw */)
{
    // Output is sh wide × sw tall. Output (x', y') ← input (y', sh-1-x').
    const uint32_t dw = sh;
    const uint32_t dh = sw;
    for (uint32_t y = 0; y < dh; y++) {
        uint8_t* dstRow = dst + static_cast<size_t>(y) * dw * channels;
        for (uint32_t x = 0; x < dw; x++) {
            const uint32_t sx = y;
            const uint32_t sy = sh - 1 - x;
            const uint8_t* srcPx = src + static_cast<size_t>(sy) * sw * channels + static_cast<size_t>(sx) * channels;
            uint8_t* dstPx = dstRow + static_cast<size_t>(x) * channels;
            for (uint32_t c = 0; c < channels; c++) dstPx[c] = srcPx[c];
        }
    }
}

void rotate180(
    const uint8_t* src, uint32_t sw, uint32_t sh, uint32_t channels, uint8_t* dst /* sw × sh */)
{
    // Output (x', y') ← input (sw-1-x', sh-1-y').
    for (uint32_t y = 0; y < sh; y++) {
        uint8_t* dstRow = dst + static_cast<size_t>(y) * sw * channels;
        const uint8_t* srcRow = src + static_cast<size_t>(sh - 1 - y) * sw * channels;
        for (uint32_t x = 0; x < sw; x++) {
            const uint8_t* srcPx = srcRow + static_cast<size_t>(sw - 1 - x) * channels;
            uint8_t* dstPx = dstRow + static_cast<size_t>(x) * channels;
            for (uint32_t c = 0; c < channels; c++) dstPx[c] = srcPx[c];
        }
    }
}

void rotate270Clockwise(
    const uint8_t* src, uint32_t sw, uint32_t sh, uint32_t channels, uint8_t* dst /* sh × sw */)
{
    // Same as 90° counter-clockwise. Output (x', y') ← input (sw-1-y', x').
    const uint32_t dw = sh;
    const uint32_t dh = sw;
    for (uint32_t y = 0; y < dh; y++) {
        uint8_t* dstRow = dst + static_cast<size_t>(y) * dw * channels;
        for (uint32_t x = 0; x < dw; x++) {
            const uint32_t sx = sw - 1 - y;
            const uint32_t sy = x;
            const uint8_t* srcPx = src + static_cast<size_t>(sy) * sw * channels + static_cast<size_t>(sx) * channels;
            uint8_t* dstPx = dstRow + static_cast<size_t>(x) * channels;
            for (uint32_t c = 0; c < channels; c++) dstPx[c] = srcPx[c];
        }
    }
}

void flipHorizontal(
    const uint8_t* src, uint32_t sw, uint32_t sh, uint32_t channels, uint8_t* dst /* sw × sh */)
{
    // Mirror left-right. Output (x', y') ← input (sw-1-x', y').
    for (uint32_t y = 0; y < sh; y++) {
        const uint8_t* srcRow = src + static_cast<size_t>(y) * sw * channels;
        uint8_t* dstRow = dst + static_cast<size_t>(y) * sw * channels;
        for (uint32_t x = 0; x < sw; x++) {
            const uint8_t* srcPx = srcRow + static_cast<size_t>(sw - 1 - x) * channels;
            uint8_t* dstPx = dstRow + static_cast<size_t>(x) * channels;
            for (uint32_t c = 0; c < channels; c++) dstPx[c] = srcPx[c];
        }
    }
}

void flipVertical(
    const uint8_t* src, uint32_t sw, uint32_t sh, uint32_t channels, uint8_t* dst /* sw × sh */)
{
    // Mirror top-bottom. Whole-row memcpy — no per-pixel inner loop needed.
    const size_t rowBytes = static_cast<size_t>(sw) * channels;
    for (uint32_t y = 0; y < sh; y++) {
        const uint8_t* srcRow = src + static_cast<size_t>(sh - 1 - y) * rowBytes;
        uint8_t* dstRow = dst + static_cast<size_t>(y) * rowBytes;
        std::memcpy(dstRow, srcRow, rowBytes);
    }
}

// ─── Crop ──────────────────────────────────────────────────────────────────
// Extract an axis-aligned rectangular region. Pure memcpy per row of
// the contiguous slice — no per-pixel work. The crop rectangle must
// fit entirely inside the source (callers who need clamping or
// edge-padding are expected to handle that themselves).

void cropRect(
    const uint8_t* src, uint32_t sw, uint32_t /* sh */, uint32_t channels,
    uint8_t* dst, uint32_t cropX, uint32_t cropY, uint32_t cropW, uint32_t cropH)
{
    const size_t srcStride = static_cast<size_t>(sw) * channels;
    const size_t rowBytes = static_cast<size_t>(cropW) * channels;
    for (uint32_t y = 0; y < cropH; y++) {
        const uint8_t* srcRow = src + (static_cast<size_t>(cropY + y) * srcStride) + (static_cast<size_t>(cropX) * channels);
        uint8_t* dstRow = dst + static_cast<size_t>(y) * rowBytes;
        std::memcpy(dstRow, srcRow, rowBytes);
    }
}

// ─── Bilinear resize ───────────────────────────────────────────────────────
// CPU-side bilinear resampling. Each output pixel samples the four nearest
// input pixels with bilinear weights derived from the half-pixel-centered
// source coordinate. Works with 1-, 3-, or 4-channel input.
//
// Half-pixel centering (`(ox + 0.5) * w/newW - 0.5`) matches the convention
// most image libraries use (Pillow, OpenCV, sharp): pixel centers, not
// edges, are at integer coordinates. Without it, exact 1× resizes drift by
// half a pixel and a 2× upsample loses edge quality.
//
// Future: a `gpu.resize` kernel that does this on GPU directly. The
// conv2D kernel doesn't fit because the sample center moves per output
// pixel; resize wants its own dedicated dispatch.

void resizeBilinear(
    const uint8_t* src, uint32_t sw, uint32_t sh, uint32_t channels,
    uint8_t* dst, uint32_t dw, uint32_t dh)
{
    const float xRatio = static_cast<float>(sw) / static_cast<float>(dw);
    const float yRatio = static_cast<float>(sh) / static_cast<float>(dh);
    const size_t cost = static_cast<size_t>(dw) * dh * channels * 4;
    parallelRows(dh, cost, [&](uint32_t y0, uint32_t y1) {
    for (uint32_t oy = y0; oy < y1; oy++) {
        const float syf = (static_cast<float>(oy) + 0.5f) * yRatio - 0.5f;
        int sy0 = static_cast<int>(std::floor(syf));
        int sy1 = sy0 + 1;
        float ty = syf - static_cast<float>(sy0);
        if (sy0 < 0) { sy0 = 0; ty = 0.0f; }
        if (sy1 >= static_cast<int>(sh)) sy1 = static_cast<int>(sh) - 1;
        if (sy0 >= static_cast<int>(sh)) sy0 = static_cast<int>(sh) - 1;

        for (uint32_t ox = 0; ox < dw; ox++) {
            const float sxf = (static_cast<float>(ox) + 0.5f) * xRatio - 0.5f;
            int sx0 = static_cast<int>(std::floor(sxf));
            int sx1 = sx0 + 1;
            float tx = sxf - static_cast<float>(sx0);
            if (sx0 < 0) { sx0 = 0; tx = 0.0f; }
            if (sx1 >= static_cast<int>(sw)) sx1 = static_cast<int>(sw) - 1;
            if (sx0 >= static_cast<int>(sw)) sx0 = static_cast<int>(sw) - 1;

            const size_t rowStride = static_cast<size_t>(sw) * channels;
            const uint8_t* p00 = src + static_cast<size_t>(sy0) * rowStride + static_cast<size_t>(sx0) * channels;
            const uint8_t* p01 = src + static_cast<size_t>(sy0) * rowStride + static_cast<size_t>(sx1) * channels;
            const uint8_t* p10 = src + static_cast<size_t>(sy1) * rowStride + static_cast<size_t>(sx0) * channels;
            const uint8_t* p11 = src + static_cast<size_t>(sy1) * rowStride + static_cast<size_t>(sx1) * channels;

            uint8_t* out = dst + static_cast<size_t>(oy) * dw * channels + static_cast<size_t>(ox) * channels;
            const float w00 = (1.0f - tx) * (1.0f - ty);
            const float w01 = tx * (1.0f - ty);
            const float w10 = (1.0f - tx) * ty;
            const float w11 = tx * ty;
            for (uint32_t c = 0; c < channels; c++) {
                const float v = static_cast<float>(p00[c]) * w00
                              + static_cast<float>(p01[c]) * w01
                              + static_cast<float>(p10[c]) * w10
                              + static_cast<float>(p11[c]) * w11;
                int rounded = static_cast<int>(v + 0.5f);
                if (rounded < 0) rounded = 0;
                if (rounded > 255) rounded = 255;
                out[c] = static_cast<uint8_t>(rounded);
            }
        }
    }
    });
}

// ─── PNG encode ────────────────────────────────────────────────────────────
// libpng's simplified png_image_write_to_memory handles all the chunk +
// filter machinery. Accepts RGB (3 channels) and RGBA (4 channels)
// directly; gray + grayscale-alpha possible later.

// Memory-sink writer callback for png_set_write_fn. Output goes into
// outData via append.
namespace {
void pngMemWriteFn(png_structp png, png_bytep data, png_size_t len)
{
    auto* out = static_cast<std::vector<uint8_t>*>(png_get_io_ptr(png));
    out->insert(out->end(), data, data + len);
}
void pngMemFlushFn(png_structp) {}
} // anonymous namespace

bool encodePngBytes(
    const uint8_t* pixels, uint32_t width, uint32_t height, uint32_t channels,
    std::vector<uint8_t>& outData,
    char* outErr, size_t outErrLen)
{
    if (channels != 3 && channels != 4) {
        std::snprintf(outErr, outErrLen, "PNG encode requires 3- or 4-channel input, got %u", channels);
        return false;
    }

    PngErrCapture errCap = { outErr, outErrLen };
    png_structp png = png_create_write_struct(PNG_LIBPNG_VER_STRING, &errCap, pngErrFn, pngWarnFn);
    if (!png) {
        std::strncpy(outErr, "PNG: create_write_struct failed", outErrLen - 1);
        return false;
    }
    png_infop info = png_create_info_struct(png);
    if (!info) {
        png_destroy_write_struct(&png, nullptr);
        std::strncpy(outErr, "PNG: create_info_struct failed", outErrLen - 1);
        return false;
    }

    if (setjmp(png_jmpbuf(png))) {
        png_destroy_write_struct(&png, &info);
        return false;
    }

    outData.clear();
    outData.reserve(static_cast<size_t>(width) * height * channels / 2); // ballpark
    png_set_write_fn(png, &outData, pngMemWriteFn, pngMemFlushFn);

    // Compression level 6 — same as the simplified API's default and what
    // libvips uses. Higher levels cost more CPU than they save bytes for
    // photo-style content.
    png_set_compression_level(png, 6);
    // Filtering: SUB filter for RGB/RGBA tends to be the best general
    // choice — libpng's heuristic mode picks per-row but at higher CPU
    // cost. Locking SUB matches what Sharp does and saves ~30% encode
    // time at <1% size penalty for typical photo content.
    png_set_filter(png, 0, PNG_FILTER_SUB);

    const int colorType = (channels == 4) ? PNG_COLOR_TYPE_RGBA : PNG_COLOR_TYPE_RGB;
    png_set_IHDR(png, info, width, height, 8, colorType, PNG_INTERLACE_NONE,
        PNG_COMPRESSION_TYPE_DEFAULT, PNG_FILTER_TYPE_DEFAULT);
    png_write_info(png, info);

    const size_t rowStride = static_cast<size_t>(width) * channels;
    std::vector<png_bytep> rowPtrs(height);
    for (uint32_t y = 0; y < height; y++) {
        rowPtrs[y] = const_cast<png_bytep>(pixels + y * rowStride);
    }
    png_write_image(png, rowPtrs.data());
    png_write_end(png, info);

    png_destroy_write_struct(&png, &info);
    return true;
}

} // anonymous namespace

JSC_DEFINE_HOST_FUNCTION(functionDecode,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue arg = callFrame->argument(0);
    if (!arg.isCell() || arg.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.decode: expected Uint8Array"_s);
        return {};
    }
    auto* view = jsCast<JSC::JSArrayBufferView*>(arg.asCell());
    void* dataPtr = view->vector();
    if (!dataPtr) {
        throwTypeError(globalObject, scope, "bun:image.decode: typed array is detached"_s);
        return {};
    }
    const uint8_t* bytes = static_cast<const uint8_t*>(dataPtr);
    const size_t len = view->length();

    const char* format = detectFormat(bytes, len);
    if (!format) {
        throwTypeError(globalObject, scope, "bun:image.decode: unrecognized format (expected JPEG or PNG)"_s);
        return {};
    }

    std::vector<uint8_t> data;
    uint32_t width = 0, height = 0, channels = 0;
    char errMsg[256] = { 0 };
    bool ok = false;
    if (std::strcmp(format, "jpeg") == 0) {
        ok = decodeJpegBytes(bytes, len, data, width, height, channels, errMsg, sizeof(errMsg));
    } else if (std::strcmp(format, "png") == 0) {
        ok = decodePngBytes(bytes, len, data, width, height, channels, errMsg, sizeof(errMsg));
    } else {
        ok = decodeWebPBytes(bytes, len, data, width, height, channels, errMsg, sizeof(errMsg));
    }

    if (!ok) {
        throwTypeError(globalObject, scope, makeString("bun:image.decode: "_s, String::fromUTF8(errMsg)));
        return {};
    }

    // Build the result Uint8Array (Buffer subclass — JS sees it as Uint8Array,
    // and we get the well-trodden createUninitialized path that the SQL
    // bindings use for raw bytea).
    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    auto* dataArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, data.size());
    RETURN_IF_EXCEPTION(scope, {});
    if (data.size() > 0) {
        std::memcpy(dataArr->vector(), data.data(), data.size());
    }

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dataArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(width));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(height));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(channels));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), jsString(vm, String::fromUTF8(format)));
    return JSValue::encode(obj);
}

JSC_DEFINE_HOST_FUNCTION(functionEncode,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    JSValue optsArg = callFrame->argument(1);
    if (!imgArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.encode: img must be the object returned from decode()"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);

    // Pull the format string out of opts.
    if (!optsArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.encode: opts must be { format, quality? }"_s);
        return {};
    }
    auto* optsObj = asObject(optsArg);
    JSValue formatVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});
    if (!formatVal.isString()) {
        throwTypeError(globalObject, scope, "bun:image.encode: opts.format must be \"jpeg\" or \"png\""_s);
        return {};
    }
    auto formatStr = formatVal.toWTFString(globalObject).utf8();
    RETURN_IF_EXCEPTION(scope, {});
    bool isJpeg = std::strcmp(formatStr.data(), "jpeg") == 0;
    bool isPng = std::strcmp(formatStr.data(), "png") == 0;
    bool isWebp = std::strcmp(formatStr.data(), "webp") == 0;
    if (!isJpeg && !isPng && !isWebp) {
        throwTypeError(globalObject, scope, makeString("bun:image.encode: unknown format "_s, formatVal.toWTFString(globalObject)));
        return {};
    }

    // Pull dims + pixel data out of img.
    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!widthVal.isNumber() || !heightVal.isNumber() || !channelsVal.isNumber()) {
        throwTypeError(globalObject, scope, "bun:image.encode: img.width/height/channels must be numbers"_s);
        return {};
    }
    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.encode: img.data must be a Uint8Array"_s);
        return {};
    }
    uint32_t width = widthVal.toUInt32(globalObject);
    uint32_t height = heightVal.toUInt32(globalObject);
    uint32_t channels = channelsVal.toUInt32(globalObject);
    auto* dataView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* pixelsRaw = dataView->vector();
    if (!pixelsRaw) {
        throwTypeError(globalObject, scope, "bun:image.encode: img.data is detached"_s);
        return {};
    }
    const uint8_t* pixels = static_cast<const uint8_t*>(pixelsRaw);
    if (dataView->length() != static_cast<size_t>(width) * height * channels) {
        throwTypeError(globalObject, scope, "bun:image.encode: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    int quality = 85;
    JSValue qualityVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "quality"_s));
    RETURN_IF_EXCEPTION(scope, {});
    if (qualityVal.isNumber()) quality = qualityVal.toInt32(globalObject);

    bool lossless = false;
    JSValue losslessVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "lossless"_s));
    RETURN_IF_EXCEPTION(scope, {});
    if (losslessVal.isBoolean()) lossless = losslessVal.asBoolean();

    std::vector<uint8_t> outBytes;
    char errMsg[256] = { 0 };
    bool ok;
    if (isJpeg) {
        ok = encodeJpegBytes(pixels, width, height, channels, quality, outBytes, errMsg, sizeof(errMsg));
    } else if (isPng) {
        ok = encodePngBytes(pixels, width, height, channels, outBytes, errMsg, sizeof(errMsg));
    } else {
        ok = encodeWebPBytes(pixels, width, height, channels, quality, lossless, outBytes, errMsg, sizeof(errMsg));
    }

    if (!ok) {
        throwTypeError(globalObject, scope, makeString("bun:image.encode: "_s, String::fromUTF8(errMsg)));
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    auto* result = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes.size());
    RETURN_IF_EXCEPTION(scope, {});
    if (outBytes.size() > 0) std::memcpy(result->vector(), outBytes.data(), outBytes.size());
    return JSValue::encode(result);
}

// resize(img, opts) → DecodedImage
// opts: { width, height } (both required for v1; aspect-preserving fit
// modes follow). Algorithm: bilinear resampling on the CPU.
JSC_DEFINE_HOST_FUNCTION(functionResize,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    JSValue optsArg = callFrame->argument(1);
    if (!imgArg.isObject() || !optsArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.resize: expected (img, { width, height })"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);
    auto* optsObj = asObject(optsArg);

    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    JSValue formatVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.resize: img.data must be a Uint8Array"_s);
        return {};
    }
    auto* srcView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* srcRaw = srcView->vector();
    if (!srcRaw) {
        throwTypeError(globalObject, scope, "bun:image.resize: img.data is detached"_s);
        return {};
    }
    const uint32_t sw = widthVal.toUInt32(globalObject);
    const uint32_t sh = heightVal.toUInt32(globalObject);
    const uint32_t channels = channelsVal.toUInt32(globalObject);
    if (channels != 1 && channels != 3 && channels != 4) {
        throwTypeError(globalObject, scope, "bun:image.resize: channels must be 1, 3, or 4"_s);
        return {};
    }
    if (srcView->length() != static_cast<size_t>(sw) * sh * channels) {
        throwTypeError(globalObject, scope, "bun:image.resize: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    JSValue dwVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue dhVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    RETURN_IF_EXCEPTION(scope, {});
    if (!dwVal.isNumber() || !dhVal.isNumber()) {
        throwTypeError(globalObject, scope, "bun:image.resize: opts.width and opts.height are required"_s);
        return {};
    }
    const int32_t dwSigned = dwVal.toInt32(globalObject);
    const int32_t dhSigned = dhVal.toInt32(globalObject);
    if (dwSigned < 1 || dhSigned < 1) {
        throwTypeError(globalObject, scope, "bun:image.resize: opts.width and opts.height must be >= 1"_s);
        return {};
    }
    const uint32_t dw = static_cast<uint32_t>(dwSigned);
    const uint32_t dh = static_cast<uint32_t>(dhSigned);

    // Pick resampling kernel: "bilinear" (default, fast) or "lanczos"
    // (sharper, ~3-4× slower but better for downscaling especially).
    JSValue kernelVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "kernel"_s));
    RETURN_IF_EXCEPTION(scope, {});
    bool useLanczos = false;
    if (kernelVal.isString()) {
        auto kStr = kernelVal.toWTFString(globalObject).utf8();
        RETURN_IF_EXCEPTION(scope, {});
        if (std::strcmp(kStr.data(), "lanczos") == 0) {
            useLanczos = true;
        } else if (std::strcmp(kStr.data(), "bilinear") != 0) {
            throwTypeError(globalObject, scope, "bun:image.resize: opts.kernel must be \"bilinear\" or \"lanczos\""_s);
            return {};
        }
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(dw) * dh * channels;
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});
    if (useLanczos) {
        resizeLanczos(
            static_cast<const uint8_t*>(srcRaw), sw, sh, channels,
            static_cast<uint8_t*>(dstArr->vector()), dw, dh);
    } else {
        resizeBilinear(
            static_cast<const uint8_t*>(srcRaw), sw, sh, channels,
            static_cast<uint8_t*>(dstArr->vector()), dw, dh);
    }

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dstArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(dw));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(dh));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(channels));
    // Preserve the source's format string; resize is just pixel resampling.
    if (formatVal.isString()) {
        obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), formatVal);
    }
    return JSValue::encode(obj);
}

// blur(img, { radius }) → DecodedImage with the same dims / channels /
// format string. Channel count must be 1, 3, or 4 (gray, RGB, RGBA).
JSC_DEFINE_HOST_FUNCTION(functionBlur,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    JSValue optsArg = callFrame->argument(1);
    if (!imgArg.isObject() || !optsArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.blur: expected (img, { radius })"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);
    auto* optsObj = asObject(optsArg);

    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    JSValue formatVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.blur: img.data must be a Uint8Array"_s);
        return {};
    }
    auto* srcView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* srcRaw = srcView->vector();
    if (!srcRaw) {
        throwTypeError(globalObject, scope, "bun:image.blur: img.data is detached"_s);
        return {};
    }
    const uint32_t w = widthVal.toUInt32(globalObject);
    const uint32_t h = heightVal.toUInt32(globalObject);
    const uint32_t channels = channelsVal.toUInt32(globalObject);
    if (channels != 1 && channels != 3 && channels != 4) {
        throwTypeError(globalObject, scope, "bun:image.blur: channels must be 1, 3, or 4"_s);
        return {};
    }
    if (srcView->length() != static_cast<size_t>(w) * h * channels) {
        throwTypeError(globalObject, scope, "bun:image.blur: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    JSValue radiusVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "radius"_s));
    RETURN_IF_EXCEPTION(scope, {});
    if (!radiusVal.isNumber()) {
        throwTypeError(globalObject, scope, "bun:image.blur: opts.radius is required (number)"_s);
        return {};
    }
    const int radius = radiusVal.toInt32(globalObject);
    if (radius < 0 || radius > 100) {
        throwTypeError(globalObject, scope, "bun:image.blur: radius must be in [0, 100]"_s);
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(w) * h * channels;
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});
    gaussianBlur(
        static_cast<const uint8_t*>(srcRaw), w, h, channels,
        static_cast<uint8_t*>(dstArr->vector()), radius);

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dstArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(w));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(h));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(channels));
    if (formatVal.isString()) {
        obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), formatVal);
    }
    return JSValue::encode(obj);
}

// sharpen(img, { amount?, radius? }) → DecodedImage with the same dims /
// channels / format. Defaults: amount=1.0, radius=1 (fine-detail emphasis).
// Alpha is passed through untouched on RGBA inputs.
JSC_DEFINE_HOST_FUNCTION(functionSharpen,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    JSValue optsArg = callFrame->argument(1);
    if (!imgArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.sharpen: expected (img, { amount?, radius? })"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);
    JSObject* optsObj = optsArg.isObject() ? asObject(optsArg) : nullptr;

    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    JSValue formatVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.sharpen: img.data must be a Uint8Array"_s);
        return {};
    }
    auto* srcView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* srcRaw = srcView->vector();
    if (!srcRaw) {
        throwTypeError(globalObject, scope, "bun:image.sharpen: img.data is detached"_s);
        return {};
    }
    const uint32_t w = widthVal.toUInt32(globalObject);
    const uint32_t h = heightVal.toUInt32(globalObject);
    const uint32_t channels = channelsVal.toUInt32(globalObject);
    if (channels != 1 && channels != 3 && channels != 4) {
        throwTypeError(globalObject, scope, "bun:image.sharpen: channels must be 1, 3, or 4"_s);
        return {};
    }
    if (srcView->length() != static_cast<size_t>(w) * h * channels) {
        throwTypeError(globalObject, scope, "bun:image.sharpen: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    int radius = 1;
    float amount = 1.0f;
    if (optsObj) {
        JSValue radiusVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "radius"_s));
        RETURN_IF_EXCEPTION(scope, {});
        if (radiusVal.isNumber()) radius = radiusVal.toInt32(globalObject);
        JSValue amountVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "amount"_s));
        RETURN_IF_EXCEPTION(scope, {});
        if (amountVal.isNumber()) amount = static_cast<float>(amountVal.toNumber(globalObject));
    }
    if (radius < 0 || radius > 100) {
        throwTypeError(globalObject, scope, "bun:image.sharpen: radius must be in [0, 100]"_s);
        return {};
    }
    if (!std::isfinite(amount) || amount < -10.0f || amount > 10.0f) {
        throwTypeError(globalObject, scope, "bun:image.sharpen: amount must be a finite number in [-10, 10]"_s);
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(w) * h * channels;
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});
    unsharpSharpen(
        static_cast<const uint8_t*>(srcRaw), w, h, channels,
        static_cast<uint8_t*>(dstArr->vector()), radius, amount);

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dstArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(w));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(h));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(channels));
    if (formatVal.isString()) {
        obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), formatVal);
    }
    return JSValue::encode(obj);
}

// edgeDetect(img) → DecodedImage with channels=1 (grayscale magnitude).
// 3×3 Sobel on Rec. 601 luma; output is the same dimensions as the input
// regardless of source channel count.
JSC_DEFINE_HOST_FUNCTION(functionEdgeDetect,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    if (!imgArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.edgeDetect: expected (img)"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);

    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    JSValue formatVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.edgeDetect: img.data must be a Uint8Array"_s);
        return {};
    }
    auto* srcView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* srcRaw = srcView->vector();
    if (!srcRaw) {
        throwTypeError(globalObject, scope, "bun:image.edgeDetect: img.data is detached"_s);
        return {};
    }
    const uint32_t w = widthVal.toUInt32(globalObject);
    const uint32_t h = heightVal.toUInt32(globalObject);
    const uint32_t channels = channelsVal.toUInt32(globalObject);
    if (channels != 1 && channels != 3 && channels != 4) {
        throwTypeError(globalObject, scope, "bun:image.edgeDetect: channels must be 1, 3, or 4"_s);
        return {};
    }
    if (srcView->length() != static_cast<size_t>(w) * h * channels) {
        throwTypeError(globalObject, scope, "bun:image.edgeDetect: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(w) * h; // single channel
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});
    sobelEdgeDetect(
        static_cast<const uint8_t*>(srcRaw), w, h, channels,
        static_cast<uint8_t*>(dstArr->vector()));

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dstArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(w));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(h));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(1u));
    if (formatVal.isString()) {
        obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), formatVal);
    }
    return JSValue::encode(obj);
}

// rotate(img, { degrees }) — degrees must be 90, 180, or 270. Output dims
// swap for 90 / 270, stay the same for 180. Channels and format pass through.
JSC_DEFINE_HOST_FUNCTION(functionRotate,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    JSValue optsArg = callFrame->argument(1);
    if (!imgArg.isObject() || !optsArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.rotate: expected (img, { degrees })"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);
    auto* optsObj = asObject(optsArg);

    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    JSValue formatVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.rotate: img.data must be a Uint8Array"_s);
        return {};
    }
    auto* srcView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* srcRaw = srcView->vector();
    if (!srcRaw) {
        throwTypeError(globalObject, scope, "bun:image.rotate: img.data is detached"_s);
        return {};
    }
    const uint32_t w = widthVal.toUInt32(globalObject);
    const uint32_t h = heightVal.toUInt32(globalObject);
    const uint32_t channels = channelsVal.toUInt32(globalObject);
    if (channels != 1 && channels != 3 && channels != 4) {
        throwTypeError(globalObject, scope, "bun:image.rotate: channels must be 1, 3, or 4"_s);
        return {};
    }
    if (srcView->length() != static_cast<size_t>(w) * h * channels) {
        throwTypeError(globalObject, scope, "bun:image.rotate: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    JSValue degVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "degrees"_s));
    RETURN_IF_EXCEPTION(scope, {});
    if (!degVal.isNumber()) {
        throwTypeError(globalObject, scope, "bun:image.rotate: opts.degrees is required (number)"_s);
        return {};
    }
    const int32_t degrees = degVal.toInt32(globalObject);
    if (degrees != 90 && degrees != 180 && degrees != 270) {
        throwTypeError(globalObject, scope, "bun:image.rotate: degrees must be 90, 180, or 270"_s);
        return {};
    }

    const uint32_t dw = (degrees == 180) ? w : h;
    const uint32_t dh = (degrees == 180) ? h : w;
    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(dw) * dh * channels;
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});
    const uint8_t* srcPtr = static_cast<const uint8_t*>(srcRaw);
    uint8_t* dstPtr = static_cast<uint8_t*>(dstArr->vector());
    if (degrees == 90) {
        rotate90Clockwise(srcPtr, w, h, channels, dstPtr);
    } else if (degrees == 180) {
        rotate180(srcPtr, w, h, channels, dstPtr);
    } else {
        rotate270Clockwise(srcPtr, w, h, channels, dstPtr);
    }

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dstArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(dw));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(dh));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(channels));
    if (formatVal.isString()) {
        obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), formatVal);
    }
    return JSValue::encode(obj);
}

// flip(img, { axis }) — axis is "horizontal" (mirror left-right) or
// "vertical" (mirror top-bottom). Dims, channels, format pass through.
JSC_DEFINE_HOST_FUNCTION(functionFlip,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    JSValue optsArg = callFrame->argument(1);
    if (!imgArg.isObject() || !optsArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.flip: expected (img, { axis })"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);
    auto* optsObj = asObject(optsArg);

    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    JSValue formatVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.flip: img.data must be a Uint8Array"_s);
        return {};
    }
    auto* srcView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* srcRaw = srcView->vector();
    if (!srcRaw) {
        throwTypeError(globalObject, scope, "bun:image.flip: img.data is detached"_s);
        return {};
    }
    const uint32_t w = widthVal.toUInt32(globalObject);
    const uint32_t h = heightVal.toUInt32(globalObject);
    const uint32_t channels = channelsVal.toUInt32(globalObject);
    if (channels != 1 && channels != 3 && channels != 4) {
        throwTypeError(globalObject, scope, "bun:image.flip: channels must be 1, 3, or 4"_s);
        return {};
    }
    if (srcView->length() != static_cast<size_t>(w) * h * channels) {
        throwTypeError(globalObject, scope, "bun:image.flip: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    JSValue axisVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "axis"_s));
    RETURN_IF_EXCEPTION(scope, {});
    if (!axisVal.isString()) {
        throwTypeError(globalObject, scope, "bun:image.flip: opts.axis must be \"horizontal\" or \"vertical\""_s);
        return {};
    }
    auto axisStr = axisVal.toWTFString(globalObject).utf8();
    RETURN_IF_EXCEPTION(scope, {});
    const bool isHorizontal = std::strcmp(axisStr.data(), "horizontal") == 0;
    const bool isVertical = std::strcmp(axisStr.data(), "vertical") == 0;
    if (!isHorizontal && !isVertical) {
        throwTypeError(globalObject, scope, "bun:image.flip: opts.axis must be \"horizontal\" or \"vertical\""_s);
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(w) * h * channels;
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});
    const uint8_t* srcPtr = static_cast<const uint8_t*>(srcRaw);
    uint8_t* dstPtr = static_cast<uint8_t*>(dstArr->vector());
    if (isHorizontal) {
        flipHorizontal(srcPtr, w, h, channels, dstPtr);
    } else {
        flipVertical(srcPtr, w, h, channels, dstPtr);
    }

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dstArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(w));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(h));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(channels));
    if (formatVal.isString()) {
        obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), formatVal);
    }
    return JSValue::encode(obj);
}

// crop(img, { x, y, width, height }) → DecodedImage. The crop rectangle
// must be fully inside the source — out-of-bounds throws rather than
// silently clamping. Channels and format pass through.
JSC_DEFINE_HOST_FUNCTION(functionCrop,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    JSValue optsArg = callFrame->argument(1);
    if (!imgArg.isObject() || !optsArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.crop: expected (img, { x, y, width, height })"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);
    auto* optsObj = asObject(optsArg);

    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    JSValue formatVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.crop: img.data must be a Uint8Array"_s);
        return {};
    }
    auto* srcView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* srcRaw = srcView->vector();
    if (!srcRaw) {
        throwTypeError(globalObject, scope, "bun:image.crop: img.data is detached"_s);
        return {};
    }
    const uint32_t sw = widthVal.toUInt32(globalObject);
    const uint32_t sh = heightVal.toUInt32(globalObject);
    const uint32_t channels = channelsVal.toUInt32(globalObject);
    if (channels != 1 && channels != 3 && channels != 4) {
        throwTypeError(globalObject, scope, "bun:image.crop: channels must be 1, 3, or 4"_s);
        return {};
    }
    if (srcView->length() != static_cast<size_t>(sw) * sh * channels) {
        throwTypeError(globalObject, scope, "bun:image.crop: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    JSValue xVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "x"_s));
    JSValue yVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "y"_s));
    JSValue cwVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue chVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    RETURN_IF_EXCEPTION(scope, {});
    if (!xVal.isNumber() || !yVal.isNumber() || !cwVal.isNumber() || !chVal.isNumber()) {
        throwTypeError(globalObject, scope, "bun:image.crop: opts.x, .y, .width, .height are all required (numbers)"_s);
        return {};
    }
    const int32_t xS = xVal.toInt32(globalObject);
    const int32_t yS = yVal.toInt32(globalObject);
    const int32_t cwS = cwVal.toInt32(globalObject);
    const int32_t chS = chVal.toInt32(globalObject);
    if (xS < 0 || yS < 0) {
        throwTypeError(globalObject, scope, "bun:image.crop: opts.x and opts.y must be >= 0"_s);
        return {};
    }
    if (cwS < 1 || chS < 1) {
        throwTypeError(globalObject, scope, "bun:image.crop: opts.width and opts.height must be >= 1"_s);
        return {};
    }
    const uint32_t x = static_cast<uint32_t>(xS);
    const uint32_t y = static_cast<uint32_t>(yS);
    const uint32_t cw = static_cast<uint32_t>(cwS);
    const uint32_t ch = static_cast<uint32_t>(chS);
    // Bounds check — crop must fit entirely inside the source.
    if (x + cw > sw || y + ch > sh) {
        throwTypeError(globalObject, scope,
            makeString("bun:image.crop: crop rectangle ("_s,
                String::number(x), ","_s, String::number(y), " "_s,
                String::number(cw), "x"_s, String::number(ch),
                ") extends past source bounds ("_s,
                String::number(sw), "x"_s, String::number(sh), ")"_s));
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(cw) * ch * channels;
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});
    cropRect(
        static_cast<const uint8_t*>(srcRaw), sw, sh, channels,
        static_cast<uint8_t*>(dstArr->vector()), x, y, cw, ch);

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dstArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(cw));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(ch));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(channels));
    if (formatVal.isString()) {
        obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), formatVal);
    }
    return JSValue::encode(obj);
}

// toGrayscale(img) → DecodedImage with channels = 1. Rec. 601 luma
// collapse; alpha is dropped for RGBA inputs. 1-channel inputs are a
// passthrough copy (callers don't need to special-case the type).
JSC_DEFINE_HOST_FUNCTION(functionToGrayscale,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    if (!imgArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.toGrayscale: expected (img)"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);

    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    JSValue formatVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.toGrayscale: img.data must be a Uint8Array"_s);
        return {};
    }
    auto* srcView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* srcRaw = srcView->vector();
    if (!srcRaw) {
        throwTypeError(globalObject, scope, "bun:image.toGrayscale: img.data is detached"_s);
        return {};
    }
    const uint32_t w = widthVal.toUInt32(globalObject);
    const uint32_t h = heightVal.toUInt32(globalObject);
    const uint32_t channels = channelsVal.toUInt32(globalObject);
    if (channels != 1 && channels != 3 && channels != 4) {
        throwTypeError(globalObject, scope, "bun:image.toGrayscale: channels must be 1, 3, or 4"_s);
        return {};
    }
    if (srcView->length() != static_cast<size_t>(w) * h * channels) {
        throwTypeError(globalObject, scope, "bun:image.toGrayscale: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(w) * h; // single channel
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});
    rgbToLuma(
        static_cast<const uint8_t*>(srcRaw), w, h, channels,
        static_cast<uint8_t*>(dstArr->vector()));

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dstArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(w));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(h));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(1u));
    if (formatVal.isString()) {
        obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), formatVal);
    }
    return JSValue::encode(obj);
}

// adjust(img, { brightness?, contrast?, saturation? }) → DecodedImage with
// the same dims / channels / format. All three parameters default to 0
// (identity); each is a number in [-1, 1].
JSC_DEFINE_HOST_FUNCTION(functionAdjust,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    JSValue optsArg = callFrame->argument(1);
    if (!imgArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.adjust: expected (img, { brightness?, contrast?, saturation? })"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);
    JSObject* optsObj = optsArg.isObject() ? asObject(optsArg) : nullptr;

    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    JSValue formatVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.adjust: img.data must be a Uint8Array"_s);
        return {};
    }
    auto* srcView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* srcRaw = srcView->vector();
    if (!srcRaw) {
        throwTypeError(globalObject, scope, "bun:image.adjust: img.data is detached"_s);
        return {};
    }
    const uint32_t w = widthVal.toUInt32(globalObject);
    const uint32_t h = heightVal.toUInt32(globalObject);
    const uint32_t channels = channelsVal.toUInt32(globalObject);
    if (channels != 1 && channels != 3 && channels != 4) {
        throwTypeError(globalObject, scope, "bun:image.adjust: channels must be 1, 3, or 4"_s);
        return {};
    }
    if (srcView->length() != static_cast<size_t>(w) * h * channels) {
        throwTypeError(globalObject, scope, "bun:image.adjust: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    float brightness = 0.0f, contrast = 0.0f, saturation = 0.0f;
    if (optsObj) {
        JSValue bVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "brightness"_s));
        RETURN_IF_EXCEPTION(scope, {});
        if (bVal.isNumber()) brightness = static_cast<float>(bVal.toNumber(globalObject));
        JSValue cVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "contrast"_s));
        RETURN_IF_EXCEPTION(scope, {});
        if (cVal.isNumber()) contrast = static_cast<float>(cVal.toNumber(globalObject));
        JSValue sVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "saturation"_s));
        RETURN_IF_EXCEPTION(scope, {});
        if (sVal.isNumber()) saturation = static_cast<float>(sVal.toNumber(globalObject));
    }
    auto inRange = [](float v) { return std::isfinite(v) && v >= -1.0f && v <= 1.0f; };
    if (!inRange(brightness) || !inRange(contrast) || !inRange(saturation)) {
        throwTypeError(globalObject, scope, "bun:image.adjust: brightness / contrast / saturation must each be a finite number in [-1, 1]"_s);
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(w) * h * channels;
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});
    adjustToneCpu(
        static_cast<const uint8_t*>(srcRaw), w, h, channels,
        static_cast<uint8_t*>(dstArr->vector()), brightness, contrast, saturation);

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dstArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(w));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(h));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(channels));
    if (formatVal.isString()) {
        obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), formatVal);
    }
    return JSValue::encode(obj);
}

// histogram(img) → Uint32Array[]. Returns one Uint32Array(256) per
// channel, in channel order: 1-channel → [gray]; 3-channel → [R, G, B];
// 4-channel → [R, G, B, A]. Each bin is the count of pixels at that
// 8-bit intensity in that channel.
JSC_DEFINE_HOST_FUNCTION(functionHistogram,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    if (!imgArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.histogram: expected (img)"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);

    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.histogram: img.data must be a Uint8Array"_s);
        return {};
    }
    auto* srcView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* srcRaw = srcView->vector();
    if (!srcRaw) {
        throwTypeError(globalObject, scope, "bun:image.histogram: img.data is detached"_s);
        return {};
    }
    const uint32_t w = widthVal.toUInt32(globalObject);
    const uint32_t h = heightVal.toUInt32(globalObject);
    const uint32_t channels = channelsVal.toUInt32(globalObject);
    if (channels != 1 && channels != 3 && channels != 4) {
        throwTypeError(globalObject, scope, "bun:image.histogram: channels must be 1, 3, or 4"_s);
        return {};
    }
    if (srcView->length() != static_cast<size_t>(w) * h * channels) {
        throwTypeError(globalObject, scope, "bun:image.histogram: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    // Compute into a flat scratch buffer first, then split into per-channel
    // Uint32Array views packaged into a JSArray.
    std::vector<uint32_t> hist(static_cast<size_t>(channels) * 256, 0);
    perChannelHistogramCpu(static_cast<const uint8_t*>(srcRaw), w, h, channels, hist.data());

    // Build the output: an Array of `channels` Uint32Arrays, each of length 256.
    auto* arr = JSC::constructEmptyArray(globalObject, nullptr, channels);
    RETURN_IF_EXCEPTION(scope, {});
    for (uint32_t c = 0; c < channels; c++) {
        auto* chanArr = JSC::JSUint32Array::createUninitialized(
            globalObject,
            globalObject->typedArrayStructure(JSC::TypeUint32, /* isResizableOrGrowableShared */ false),
            256);
        RETURN_IF_EXCEPTION(scope, {});
        std::memcpy(chanArr->vector(), hist.data() + (c * 256), sizeof(uint32_t) * 256);
        arr->putDirectIndex(globalObject, c, chanArr);
        RETURN_IF_EXCEPTION(scope, {});
    }
    return JSValue::encode(arr);
}

// composite(base, overlay, { x?, y? }) → DecodedImage. Output dims and
// channels match `base`. Out-of-bounds overlay regions are clipped.
JSC_DEFINE_HOST_FUNCTION(functionComposite,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue baseArg = callFrame->argument(0);
    JSValue overlayArg = callFrame->argument(1);
    JSValue optsArg = callFrame->argument(2);
    if (!baseArg.isObject() || !overlayArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.composite: expected (base, overlay, { x?, y? })"_s);
        return {};
    }
    auto* baseObj = asObject(baseArg);
    auto* overlayObj = asObject(overlayArg);
    JSObject* optsObj = optsArg.isObject() ? asObject(optsArg) : nullptr;

    auto extract = [&](JSObject* obj, const ASCIILiteral& errPrefix,
                       const uint8_t*& outPtr, uint32_t& outW, uint32_t& outH, uint32_t& outChannels) -> bool {
        JSValue widthVal = obj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
        JSValue heightVal = obj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
        JSValue channelsVal = obj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
        JSValue dataVal = obj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
        if (scope.exception()) return false;
        if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
            throwTypeError(globalObject, scope, makeString(errPrefix, ".data must be a Uint8Array"_s));
            return false;
        }
        auto* view = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
        void* raw = view->vector();
        if (!raw) {
            throwTypeError(globalObject, scope, makeString(errPrefix, ".data is detached"_s));
            return false;
        }
        outW = widthVal.toUInt32(globalObject);
        outH = heightVal.toUInt32(globalObject);
        outChannels = channelsVal.toUInt32(globalObject);
        if (outChannels != 3 && outChannels != 4) {
            throwTypeError(globalObject, scope, makeString(errPrefix, ".channels must be 3 or 4 for compositing"_s));
            return false;
        }
        if (view->length() != static_cast<size_t>(outW) * outH * outChannels) {
            throwTypeError(globalObject, scope, makeString(errPrefix, ".data length doesn't match width*height*channels"_s));
            return false;
        }
        outPtr = static_cast<const uint8_t*>(raw);
        return true;
    };

    const uint8_t* basePtr = nullptr;
    uint32_t bw = 0, bh = 0, bChannels = 0;
    if (!extract(baseObj, "bun:image.composite: base"_s, basePtr, bw, bh, bChannels)) return {};
    const uint8_t* overlayPtr = nullptr;
    uint32_t ow = 0, oh = 0, oChannels = 0;
    if (!extract(overlayObj, "bun:image.composite: overlay"_s, overlayPtr, ow, oh, oChannels)) return {};

    int32_t px = 0, py = 0;
    if (optsObj) {
        JSValue xVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "x"_s));
        RETURN_IF_EXCEPTION(scope, {});
        if (xVal.isNumber()) px = xVal.toInt32(globalObject);
        JSValue yVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "y"_s));
        RETURN_IF_EXCEPTION(scope, {});
        if (yVal.isNumber()) py = yVal.toInt32(globalObject);
    }

    JSValue formatVal = baseObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(bw) * bh * bChannels;
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});
    compositeOver(
        basePtr, bw, bh, bChannels,
        overlayPtr, ow, oh, oChannels,
        static_cast<uint8_t*>(dstArr->vector()), px, py);

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dstArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(bw));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(bh));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(bChannels));
    if (formatVal.isString()) {
        obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), formatVal);
    }
    return JSValue::encode(obj);
}

// invert(img) → DecodedImage with the same dims/channels/format. Color
// channels become 255 - x; alpha (if present) passes through.
JSC_DEFINE_HOST_FUNCTION(functionInvert,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    if (!imgArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.invert: expected (img)"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);

    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    JSValue formatVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.invert: img.data must be a Uint8Array"_s);
        return {};
    }
    auto* srcView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* srcRaw = srcView->vector();
    if (!srcRaw) {
        throwTypeError(globalObject, scope, "bun:image.invert: img.data is detached"_s);
        return {};
    }
    const uint32_t w = widthVal.toUInt32(globalObject);
    const uint32_t h = heightVal.toUInt32(globalObject);
    const uint32_t channels = channelsVal.toUInt32(globalObject);
    if (channels != 1 && channels != 3 && channels != 4) {
        throwTypeError(globalObject, scope, "bun:image.invert: channels must be 1, 3, or 4"_s);
        return {};
    }
    if (srcView->length() != static_cast<size_t>(w) * h * channels) {
        throwTypeError(globalObject, scope, "bun:image.invert: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(w) * h * channels;
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});
    invertImage(static_cast<const uint8_t*>(srcRaw), w, h, channels,
        static_cast<uint8_t*>(dstArr->vector()));

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dstArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(w));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(h));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(channels));
    if (formatVal.isString()) {
        obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), formatVal);
    }
    return JSValue::encode(obj);
}

// threshold(img, { value? }) → DecodedImage with channels=1. value is
// 0..255 (default 128). Pixels with luma > value become 255, else 0.
JSC_DEFINE_HOST_FUNCTION(functionThreshold,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    JSValue optsArg = callFrame->argument(1);
    if (!imgArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.threshold: expected (img, { value? })"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);
    JSObject* optsObj = optsArg.isObject() ? asObject(optsArg) : nullptr;

    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    JSValue formatVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.threshold: img.data must be a Uint8Array"_s);
        return {};
    }
    auto* srcView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* srcRaw = srcView->vector();
    if (!srcRaw) {
        throwTypeError(globalObject, scope, "bun:image.threshold: img.data is detached"_s);
        return {};
    }
    const uint32_t w = widthVal.toUInt32(globalObject);
    const uint32_t h = heightVal.toUInt32(globalObject);
    const uint32_t channels = channelsVal.toUInt32(globalObject);
    if (channels != 1 && channels != 3 && channels != 4) {
        throwTypeError(globalObject, scope, "bun:image.threshold: channels must be 1, 3, or 4"_s);
        return {};
    }
    if (srcView->length() != static_cast<size_t>(w) * h * channels) {
        throwTypeError(globalObject, scope, "bun:image.threshold: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    int32_t value = 128;
    if (optsObj) {
        JSValue valVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "value"_s));
        RETURN_IF_EXCEPTION(scope, {});
        if (valVal.isNumber()) value = valVal.toInt32(globalObject);
    }
    if (value < 0 || value > 255) {
        throwTypeError(globalObject, scope, "bun:image.threshold: value must be in [0, 255]"_s);
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(w) * h; // single channel
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});
    thresholdImage(static_cast<const uint8_t*>(srcRaw), w, h, channels,
        static_cast<uint8_t*>(dstArr->vector()), static_cast<uint8_t>(value));

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dstArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(w));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(h));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(1u));
    if (formatVal.isString()) {
        obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), formatVal);
    }
    return JSValue::encode(obj);
}

// boxBlur(img, { radius }) → DecodedImage. RGBA only (channels=4).
// O(1) per output pixel via summed-area tables; speed independent of
// radius, dominant over Gaussian for r ≥ 5.
JSC_DEFINE_HOST_FUNCTION(functionBoxBlur,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue imgArg = callFrame->argument(0);
    JSValue optsArg = callFrame->argument(1);
    if (!imgArg.isObject() || !optsArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.boxBlur: expected (img, { radius })"_s);
        return {};
    }
    auto* imgObj = asObject(imgArg);
    auto* optsObj = asObject(optsArg);

    JSValue widthVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "width"_s));
    JSValue heightVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "height"_s));
    JSValue channelsVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue dataVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "data"_s));
    JSValue formatVal = imgObj->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});

    if (!dataVal.isCell() || dataVal.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.boxBlur: img.data must be a Uint8Array"_s);
        return {};
    }
    auto* srcView = jsCast<JSC::JSArrayBufferView*>(dataVal.asCell());
    void* srcRaw = srcView->vector();
    if (!srcRaw) {
        throwTypeError(globalObject, scope, "bun:image.boxBlur: img.data is detached"_s);
        return {};
    }
    const uint32_t w = widthVal.toUInt32(globalObject);
    const uint32_t h = heightVal.toUInt32(globalObject);
    const uint32_t channels = channelsVal.toUInt32(globalObject);
    if (channels != 4) {
        throwTypeError(globalObject, scope, "bun:image.boxBlur: only 4-channel RGBA inputs supported in v1"_s);
        return {};
    }
    if (srcView->length() != static_cast<size_t>(w) * h * channels) {
        throwTypeError(globalObject, scope, "bun:image.boxBlur: img.data length doesn't match width*height*channels"_s);
        return {};
    }

    JSValue radiusVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "radius"_s));
    RETURN_IF_EXCEPTION(scope, {});
    if (!radiusVal.isNumber()) {
        throwTypeError(globalObject, scope, "bun:image.boxBlur: opts.radius is required (number)"_s);
        return {};
    }
    const int radius = radiusVal.toInt32(globalObject);
    if (radius < 0 || radius > 1000) {
        throwTypeError(globalObject, scope, "bun:image.boxBlur: radius must be in [0, 1000]"_s);
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(w) * h * channels;
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});

    if (radius == 0) {
        std::memcpy(dstArr->vector(), srcRaw, outBytes);
    } else {
        boxBlurRGBA(static_cast<const uint8_t*>(srcRaw), w, h,
            static_cast<uint8_t*>(dstArr->vector()), radius);
    }

    auto* obj = JSC::constructEmptyObject(globalObject);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "data"_s), dstArr);
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "width"_s), jsNumber(w));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "height"_s), jsNumber(h));
    obj->putDirect(vm, JSC::Identifier::fromString(vm, "channels"_s), jsNumber(channels));
    if (formatVal.isString()) {
        obj->putDirect(vm, JSC::Identifier::fromString(vm, "format"_s), formatVal);
    }
    return JSValue::encode(obj);
}

// ─── Pipeline runner ──────────────────────────────────────────────────────
// Single C++ entry point that takes (input bytes, op-list, output opts)
// and runs the entire decode → transforms → encode flow in one call.
// Operations work on shared scratch buffers — no JS round-trips per op,
// no redundant pixel-buffer materialization between transforms. This
// closes the end-to-end gap with Sharp / libvips's lazy pipeline by
// matching its buffer-sharing strategy from the C++ side.
//
// Each op in the JS array is `{ kind: "resize" | "blur" | ..., ...params }`.
// We dispatch by kind and apply to the current pixel buffer in place
// when sizes match, or into a swapped-in second buffer when sizes change.

namespace {

// Ping-pong pixel-buffer state passed through the op runners.
struct PipelineState {
    std::vector<uint8_t> a;
    std::vector<uint8_t> b;
    bool useA;          // true → `a` is the active buffer, `b` is scratch
    uint32_t w;
    uint32_t h;
    uint32_t channels;

    uint8_t* current() { return useA ? a.data() : b.data(); }
    uint8_t* scratch(size_t needBytes) {
        auto& dst = useA ? b : a;
        if (dst.size() < needBytes) dst.resize(needBytes);
        return dst.data();
    }
    void swap() { useA = !useA; }
    size_t currentSize() const { return static_cast<size_t>(w) * h * channels; }
};

// Pull a numeric option off a JS object. Returns `defaultValue` if missing.
double getNumOpt(JSC::JSGlobalObject* globalObject, JSC::JSObject* obj, const String& key, double defaultValue)
{
    auto& vm = JSC::getVM(globalObject);
    JSC::JSValue v = obj->get(globalObject, JSC::Identifier::fromString(vm, key));
    if (v.isNumber()) return v.toNumber(globalObject);
    return defaultValue;
}

String getStrOpt(JSC::JSGlobalObject* globalObject, JSC::JSObject* obj, const String& key, const String& defaultValue)
{
    auto& vm = JSC::getVM(globalObject);
    JSC::JSValue v = obj->get(globalObject, JSC::Identifier::fromString(vm, key));
    if (v.isString()) return v.toWTFString(globalObject);
    return defaultValue;
}

// Apply one op. Returns false on error (and writes to outErr).
bool applyPipelineOp(
    JSC::JSGlobalObject* globalObject, JSC::ThrowScope& scope,
    PipelineState& s, JSC::JSObject* op, char* outErr, size_t outErrLen)
{
    auto& vm = JSC::getVM(globalObject);
    JSC::JSValue kindVal = op->get(globalObject, JSC::Identifier::fromString(vm, "kind"_s));
    if (scope.exception() || !kindVal.isString()) {
        std::strncpy(outErr, "pipeline op missing 'kind'", outErrLen - 1);
        return false;
    }
    auto kindStr = kindVal.toWTFString(globalObject).utf8();
    const char* kind = kindStr.data();

    if (std::strcmp(kind, "resize") == 0) {
        const int32_t dw = static_cast<int32_t>(getNumOpt(globalObject, op, "width"_s, 0));
        const int32_t dh = static_cast<int32_t>(getNumOpt(globalObject, op, "height"_s, 0));
        if (dw < 1 || dh < 1) {
            std::strncpy(outErr, "pipeline.resize: width and height required and >= 1", outErrLen - 1);
            return false;
        }
        const String kernelStr = getStrOpt(globalObject, op, "kernel"_s, "bilinear"_s);
        const bool useLanczos = kernelStr == "lanczos"_s;
        // Resize changes dims — output goes to the OPPOSITE buffer regardless of size match.
        const size_t outBytes = static_cast<size_t>(dw) * dh * s.channels;
        uint8_t* dst = s.scratch(outBytes);
        if (useLanczos) {
            resizeLanczos(s.current(), s.w, s.h, s.channels, dst, dw, dh);
        } else {
            resizeBilinear(s.current(), s.w, s.h, s.channels, dst, dw, dh);
        }
        s.swap();
        s.w = dw;
        s.h = dh;
        return true;
    }

    if (std::strcmp(kind, "blur") == 0) {
        const int radius = static_cast<int>(getNumOpt(globalObject, op, "radius"_s, 0));
        if (radius < 0 || radius > 100) {
            std::strncpy(outErr, "pipeline.blur: radius must be in [0, 100]", outErrLen - 1);
            return false;
        }
        if (radius == 0) return true;
        uint8_t* dst = s.scratch(s.currentSize());
        gaussianBlur(s.current(), s.w, s.h, s.channels, dst, radius);
        s.swap();
        return true;
    }

    if (std::strcmp(kind, "boxBlur") == 0) {
        if (s.channels != 4) {
            std::strncpy(outErr, "pipeline.boxBlur: requires 4-channel RGBA", outErrLen - 1);
            return false;
        }
        const int radius = static_cast<int>(getNumOpt(globalObject, op, "radius"_s, 0));
        if (radius < 0 || radius > 1000) {
            std::strncpy(outErr, "pipeline.boxBlur: radius must be in [0, 1000]", outErrLen - 1);
            return false;
        }
        if (radius == 0) return true;
        uint8_t* dst = s.scratch(s.currentSize());
        boxBlurRGBA(s.current(), s.w, s.h, dst, radius);
        s.swap();
        return true;
    }

    if (std::strcmp(kind, "sharpen") == 0) {
        const int radius = static_cast<int>(getNumOpt(globalObject, op, "radius"_s, 1));
        const float amount = static_cast<float>(getNumOpt(globalObject, op, "amount"_s, 1.0));
        if (radius < 0 || radius > 100) {
            std::strncpy(outErr, "pipeline.sharpen: radius must be in [0, 100]", outErrLen - 1);
            return false;
        }
        uint8_t* dst = s.scratch(s.currentSize());
        unsharpSharpen(s.current(), s.w, s.h, s.channels, dst, radius, amount);
        s.swap();
        return true;
    }

    if (std::strcmp(kind, "rotate") == 0) {
        const int32_t deg = static_cast<int32_t>(getNumOpt(globalObject, op, "degrees"_s, 0));
        if (deg != 90 && deg != 180 && deg != 270) {
            std::strncpy(outErr, "pipeline.rotate: degrees must be 90, 180, or 270", outErrLen - 1);
            return false;
        }
        const uint32_t newW = (deg == 180) ? s.w : s.h;
        const uint32_t newH = (deg == 180) ? s.h : s.w;
        uint8_t* dst = s.scratch(static_cast<size_t>(newW) * newH * s.channels);
        if (deg == 90) rotate90Clockwise(s.current(), s.w, s.h, s.channels, dst);
        else if (deg == 180) rotate180(s.current(), s.w, s.h, s.channels, dst);
        else rotate270Clockwise(s.current(), s.w, s.h, s.channels, dst);
        s.swap();
        s.w = newW;
        s.h = newH;
        return true;
    }

    if (std::strcmp(kind, "flip") == 0) {
        const String axis = getStrOpt(globalObject, op, "axis"_s, ""_s);
        const bool horiz = axis == "horizontal"_s;
        const bool vert = axis == "vertical"_s;
        if (!horiz && !vert) {
            std::strncpy(outErr, "pipeline.flip: axis must be \"horizontal\" or \"vertical\"", outErrLen - 1);
            return false;
        }
        uint8_t* dst = s.scratch(s.currentSize());
        if (horiz) flipHorizontal(s.current(), s.w, s.h, s.channels, dst);
        else flipVertical(s.current(), s.w, s.h, s.channels, dst);
        s.swap();
        return true;
    }

    if (std::strcmp(kind, "crop") == 0) {
        const int32_t cx = static_cast<int32_t>(getNumOpt(globalObject, op, "x"_s, 0));
        const int32_t cy = static_cast<int32_t>(getNumOpt(globalObject, op, "y"_s, 0));
        const int32_t cw = static_cast<int32_t>(getNumOpt(globalObject, op, "width"_s, 0));
        const int32_t ch = static_cast<int32_t>(getNumOpt(globalObject, op, "height"_s, 0));
        if (cx < 0 || cy < 0 || cw < 1 || ch < 1
            || static_cast<uint32_t>(cx + cw) > s.w
            || static_cast<uint32_t>(cy + ch) > s.h) {
            std::strncpy(outErr, "pipeline.crop: rectangle out of bounds", outErrLen - 1);
            return false;
        }
        const size_t outBytes = static_cast<size_t>(cw) * ch * s.channels;
        uint8_t* dst = s.scratch(outBytes);
        cropRect(s.current(), s.w, s.h, s.channels, dst, cx, cy, cw, ch);
        s.swap();
        s.w = cw;
        s.h = ch;
        return true;
    }

    if (std::strcmp(kind, "adjust") == 0) {
        const float br = static_cast<float>(getNumOpt(globalObject, op, "brightness"_s, 0.0));
        const float ct = static_cast<float>(getNumOpt(globalObject, op, "contrast"_s, 0.0));
        const float sat = static_cast<float>(getNumOpt(globalObject, op, "saturation"_s, 0.0));
        uint8_t* dst = s.scratch(s.currentSize());
        adjustToneCpu(s.current(), s.w, s.h, s.channels, dst, br, ct, sat);
        s.swap();
        return true;
    }

    if (std::strcmp(kind, "invert") == 0) {
        uint8_t* dst = s.scratch(s.currentSize());
        invertImage(s.current(), s.w, s.h, s.channels, dst);
        s.swap();
        return true;
    }

    if (std::strcmp(kind, "threshold") == 0) {
        const int32_t value = static_cast<int32_t>(getNumOpt(globalObject, op, "value"_s, 128));
        if (value < 0 || value > 255) {
            std::strncpy(outErr, "pipeline.threshold: value must be in [0, 255]", outErrLen - 1);
            return false;
        }
        // threshold collapses to 1 channel.
        const size_t outBytes = static_cast<size_t>(s.w) * s.h;
        uint8_t* dst = s.scratch(outBytes);
        thresholdImage(s.current(), s.w, s.h, s.channels, dst, static_cast<uint8_t>(value));
        s.swap();
        s.channels = 1;
        return true;
    }

    if (std::strcmp(kind, "toGrayscale") == 0) {
        const size_t outBytes = static_cast<size_t>(s.w) * s.h;
        uint8_t* dst = s.scratch(outBytes);
        rgbToLuma(s.current(), s.w, s.h, s.channels, dst);
        s.swap();
        s.channels = 1;
        return true;
    }

    std::snprintf(outErr, outErrLen, "pipeline: unknown op kind \"%s\"", kind);
    return false;
}

} // anonymous namespace

// runPipeline(inputBytes, opsArray, outOpts) → Uint8Array
//   inputBytes : Uint8Array containing the encoded source image
//   opsArray   : array of { kind, ...params } op descriptors
//   outOpts    : { format: "jpeg" | "png" | "webp", quality?, lossless? }
JSC_DEFINE_HOST_FUNCTION(functionRunPipeline,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue inArg = callFrame->argument(0);
    JSValue opsArg = callFrame->argument(1);
    JSValue outArg = callFrame->argument(2);

    if (!inArg.isCell() || inArg.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "bun:image.pipeline: input must be a Uint8Array"_s);
        return {};
    }
    if (!opsArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.pipeline: ops must be an array"_s);
        return {};
    }
    if (!outArg.isObject()) {
        throwTypeError(globalObject, scope, "bun:image.pipeline: out opts must be an object"_s);
        return {};
    }
    auto* inView = jsCast<JSC::JSArrayBufferView*>(inArg.asCell());
    void* inRaw = inView->vector();
    if (!inRaw) {
        throwTypeError(globalObject, scope, "bun:image.pipeline: input is detached"_s);
        return {};
    }
    const uint8_t* inBytes = static_cast<const uint8_t*>(inRaw);
    const size_t inLen = inView->length();

    // Decode once.
    const char* fmtIn = detectFormat(inBytes, inLen);
    if (!fmtIn) {
        throwTypeError(globalObject, scope, "bun:image.pipeline: input format not recognized"_s);
        return {};
    }
    PipelineState state;
    state.useA = true;
    char errMsg[256] = { 0 };
    bool ok = false;
    if (std::strcmp(fmtIn, "jpeg") == 0) {
        ok = decodeJpegBytes(inBytes, inLen, state.a, state.w, state.h, state.channels, errMsg, sizeof(errMsg));
    } else if (std::strcmp(fmtIn, "png") == 0) {
        ok = decodePngBytes(inBytes, inLen, state.a, state.w, state.h, state.channels, errMsg, sizeof(errMsg));
    } else {
        ok = decodeWebPBytes(inBytes, inLen, state.a, state.w, state.h, state.channels, errMsg, sizeof(errMsg));
    }
    if (!ok) {
        throwTypeError(globalObject, scope, makeString("bun:image.pipeline: decode: "_s, String::fromUTF8(errMsg)));
        return {};
    }

    // Run ops in order.
    auto* opsObj = asObject(opsArg);
    JSValue lengthVal = opsObj->get(globalObject, vm.propertyNames->length);
    RETURN_IF_EXCEPTION(scope, {});
    if (!lengthVal.isNumber()) {
        throwTypeError(globalObject, scope, "bun:image.pipeline: ops must have .length"_s);
        return {};
    }
    const uint32_t numOps = lengthVal.toUInt32(globalObject);
    for (uint32_t i = 0; i < numOps; i++) {
        JSValue opVal = opsObj->get(globalObject, i);
        RETURN_IF_EXCEPTION(scope, {});
        if (!opVal.isObject()) {
            throwTypeError(globalObject, scope, makeString("bun:image.pipeline: ops["_s, String::number(i), "] must be an object"_s));
            return {};
        }
        if (!applyPipelineOp(globalObject, scope, state, asObject(opVal), errMsg, sizeof(errMsg))) {
            throwTypeError(globalObject, scope, makeString("bun:image.pipeline: "_s, String::fromUTF8(errMsg)));
            return {};
        }
    }

    // Encode once.
    auto* outOpts = asObject(outArg);
    JSValue formatVal = outOpts->get(globalObject, JSC::Identifier::fromString(vm, "format"_s));
    RETURN_IF_EXCEPTION(scope, {});
    if (!formatVal.isString()) {
        throwTypeError(globalObject, scope, "bun:image.pipeline: out.format is required"_s);
        return {};
    }
    auto outFormatStr = formatVal.toWTFString(globalObject).utf8();
    const char* outFormat = outFormatStr.data();
    int quality = 85;
    JSValue qVal = outOpts->get(globalObject, JSC::Identifier::fromString(vm, "quality"_s));
    RETURN_IF_EXCEPTION(scope, {});
    if (qVal.isNumber()) quality = qVal.toInt32(globalObject);
    bool lossless = false;
    JSValue lossVal = outOpts->get(globalObject, JSC::Identifier::fromString(vm, "lossless"_s));
    RETURN_IF_EXCEPTION(scope, {});
    if (lossVal.isBoolean()) lossless = lossVal.asBoolean();

    std::vector<uint8_t> outBytes;
    bool encOk = false;
    if (std::strcmp(outFormat, "jpeg") == 0) {
        encOk = encodeJpegBytes(state.current(), state.w, state.h, state.channels, quality, outBytes, errMsg, sizeof(errMsg));
    } else if (std::strcmp(outFormat, "png") == 0) {
        encOk = encodePngBytes(state.current(), state.w, state.h, state.channels, outBytes, errMsg, sizeof(errMsg));
    } else if (std::strcmp(outFormat, "webp") == 0) {
        encOk = encodeWebPBytes(state.current(), state.w, state.h, state.channels, quality, lossless, outBytes, errMsg, sizeof(errMsg));
    } else {
        throwTypeError(globalObject, scope, makeString("bun:image.pipeline: unknown out.format "_s, formatVal.toWTFString(globalObject)));
        return {};
    }
    if (!encOk) {
        throwTypeError(globalObject, scope, makeString("bun:image.pipeline: encode: "_s, String::fromUTF8(errMsg)));
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    auto* result = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes.size());
    RETURN_IF_EXCEPTION(scope, {});
    if (outBytes.size() > 0) std::memcpy(result->vector(), outBytes.data(), outBytes.size());
    return JSValue::encode(result);
}

JSC::JSObject* createParabunImageCodecs(JSC::JSGlobalObject* globalObject)
{
    auto& vm = JSC::getVM(globalObject);
    JSC::JSObject* object = JSC::constructEmptyObject(vm, globalObject->nullPrototypeObjectStructure());
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "decode"_s), 1,
        functionDecode, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "encode"_s), 2,
        functionEncode, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "resize"_s), 2,
        functionResize, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "blur"_s), 2,
        functionBlur, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "sharpen"_s), 2,
        functionSharpen, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "edgeDetect"_s), 1,
        functionEdgeDetect, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "rotate"_s), 2,
        functionRotate, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "flip"_s), 2,
        functionFlip, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "crop"_s), 2,
        functionCrop, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "toGrayscale"_s), 1,
        functionToGrayscale, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "adjust"_s), 2,
        functionAdjust, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "histogram"_s), 1,
        functionHistogram, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "composite"_s), 3,
        functionComposite, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "invert"_s), 1,
        functionInvert, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "threshold"_s), 2,
        functionThreshold, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "boxBlur"_s), 2,
        functionBoxBlur, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "runPipeline"_s), 3,
        functionRunPipeline, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    return object;
}

} // namespace Bun
