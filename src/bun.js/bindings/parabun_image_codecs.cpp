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

#include <cmath>
#include <cstdint>
#include <cstring>
#include <csetjmp>
#include <vector>

extern "C" {
#include <jpeglib.h>
#include <png.h>
#include <webp/decode.h>
}

namespace Bun {

using namespace JSC;

// ─── JPEG decode ───────────────────────────────────────────────────────────

namespace {

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
// libpng's simplified png_image API handles all the chunk/filter/interlace
// machinery internally — for v1 that's the right tradeoff over the lower-
// level libpng API. Output format is fixed to RGBA (8-bit per channel,
// premultiplied alpha = false).
bool decodePngBytes(
    const uint8_t* bytes, size_t len,
    std::vector<uint8_t>& outData,
    uint32_t& outWidth, uint32_t& outHeight, uint32_t& outChannels,
    char* outErr, size_t outErrLen)
{
    png_image image;
    std::memset(&image, 0, sizeof(image));
    image.version = PNG_IMAGE_VERSION;

    if (png_image_begin_read_from_memory(&image, bytes, len) == 0) {
        std::strncpy(outErr, image.message[0] ? image.message : "PNG decode failed", outErrLen - 1);
        outErr[outErrLen - 1] = '\0';
        return false;
    }

    image.format = PNG_FORMAT_RGBA;
    outWidth = image.width;
    outHeight = image.height;
    outChannels = 4;

    const size_t bufSize = PNG_IMAGE_SIZE(image);
    outData.resize(bufSize);

    if (png_image_finish_read(&image, /* background */ nullptr,
            outData.data(), /* row_stride: 0 = packed */ 0,
            /* colormap */ nullptr) == 0) {
        std::strncpy(outErr, image.message[0] ? image.message : "PNG decode failed", outErrLen - 1);
        outErr[outErrLen - 1] = '\0';
        png_image_free(&image);
        return false;
    }

    png_image_free(&image);
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
    for (uint32_t oy = 0; oy < dh; oy++) {
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
}

// ─── PNG encode ────────────────────────────────────────────────────────────
// libpng's simplified png_image_write_to_memory handles all the chunk +
// filter machinery. Accepts RGB (3 channels) and RGBA (4 channels)
// directly; gray + grayscale-alpha possible later.

bool encodePngBytes(
    const uint8_t* pixels, uint32_t width, uint32_t height, uint32_t channels,
    std::vector<uint8_t>& outData,
    char* outErr, size_t outErrLen)
{
    if (channels != 3 && channels != 4) {
        std::snprintf(outErr, outErrLen, "PNG encode requires 3- or 4-channel input, got %u", channels);
        return false;
    }
    png_image image;
    std::memset(&image, 0, sizeof(image));
    image.version = PNG_IMAGE_VERSION;
    image.width = width;
    image.height = height;
    image.format = (channels == 4) ? PNG_FORMAT_RGBA : PNG_FORMAT_RGB;

    // Two-pass: first call with output=nullptr to size the buffer, then
    // allocate and call again with the real destination. The size is an
    // upper bound (PNG compresses), so we resize the result down afterwards.
    png_alloc_size_t size = 0;
    if (png_image_write_get_memory_size(image, size, /* convert_to_8bit */ 0,
            pixels, /* row_stride */ 0, /* colormap */ nullptr) == 0) {
        std::strncpy(outErr, image.message[0] ? image.message : "PNG sizing failed", outErrLen - 1);
        outErr[outErrLen - 1] = '\0';
        return false;
    }

    outData.resize(static_cast<size_t>(size));
    png_alloc_size_t actualSize = size;
    if (png_image_write_to_memory(&image, outData.data(), &actualSize,
            /* convert_to_8bit */ 0, pixels, /* row_stride */ 0, /* colormap */ nullptr) == 0) {
        std::strncpy(outErr, image.message[0] ? image.message : "PNG write failed", outErrLen - 1);
        outErr[outErrLen - 1] = '\0';
        return false;
    }
    outData.resize(static_cast<size_t>(actualSize));
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
    if (!isJpeg && !isPng) {
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

    std::vector<uint8_t> outBytes;
    char errMsg[256] = { 0 };
    bool ok = isJpeg
        ? encodeJpegBytes(pixels, width, height, channels, quality, outBytes, errMsg, sizeof(errMsg))
        : encodePngBytes(pixels, width, height, channels, outBytes, errMsg, sizeof(errMsg));

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

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    const size_t outBytes = static_cast<size_t>(dw) * dh * channels;
    auto* dstArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, outBytes);
    RETURN_IF_EXCEPTION(scope, {});
    resizeBilinear(
        static_cast<const uint8_t*>(srcRaw), sw, sh, channels,
        static_cast<uint8_t*>(dstArr->vector()), dw, dh);

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
    return object;
}

} // namespace Bun
