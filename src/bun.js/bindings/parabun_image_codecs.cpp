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

#include <cstdint>
#include <cstring>
#include <csetjmp>
#include <vector>

extern "C" {
#include <jpeglib.h>
#include <png.h>
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

// Detect format from the magic-bytes prefix. JPEG: SOI marker (FF D8 FF).
// PNG: 8-byte signature (89 50 4E 47 0D 0A 1A 0A — we check the first 4).
const char* detectFormat(const uint8_t* bytes, size_t len)
{
    if (len >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) return "jpeg";
    if (len >= 8 && bytes[0] == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') return "png";
    return nullptr;
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
    } else {
        ok = decodePngBytes(bytes, len, data, width, height, channels, errMsg, sizeof(errMsg));
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

JSC::JSObject* createParabunImageCodecs(JSC::JSGlobalObject* globalObject)
{
    auto& vm = JSC::getVM(globalObject);
    JSC::JSObject* object = JSC::constructEmptyObject(vm, globalObject->nullPrototypeObjectStructure());
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "decode"_s), 1,
        functionDecode, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    return object;
}

} // namespace Bun
