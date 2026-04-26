// Parabun: native audio-codec bindings for `bun:audio`.
//
// v1: Opus encode + decode (libopus 1.6.x). Voice + music in a single
// low-latency codec; used by every WebRTC client and the obvious choice
// for voice/video calls. Future: AAC, FLAC, MP3 decode (minimp3) all
// drop into the same module.
//
// API (from JS):
//   const enc = createOpusEncoder({ sampleRate, channels, bitrate? }) → BigInt handle
//   destroyOpusEncoder(handle)
//   opusEncode(handle, samples: Float32Array, frameSize) → Uint8Array
//   createOpusDecoder({ sampleRate, channels }) → BigInt handle
//   destroyOpusDecoder(handle)
//   opusDecode(handle, packet: Uint8Array, frameSize) → Float32Array
//
// JS class wrappers in bun:audio.ts handle lifecycle (FinalizationRegistry
// to close handles on GC) and offer a more pleasant API on top.

#include "root.h"
#include "parabun_audio_codecs.h"

#include <JavaScriptCore/CallData.h>
#include <JavaScriptCore/JSBigInt.h>
#include <JavaScriptCore/JSCInlines.h>
#include <JavaScriptCore/JSGenericTypedArrayViewInlines.h>
#include <JavaScriptCore/JSObject.h>
#include <JavaScriptCore/JSTypedArrays.h>
#include <JavaScriptCore/ObjectConstructor.h>
#include <JavaScriptCore/TypedArrayType.h>

#include "ZigGlobalObject.h"

#include <cstdint>
#include <cstring>
#include <vector>

extern "C" {
#include <opus.h>
}

namespace Bun {

using namespace JSC;

namespace {

// Opus accepts these sample rates only.
bool isValidOpusRate(int rate)
{
    return rate == 8000 || rate == 12000 || rate == 16000 || rate == 24000 || rate == 48000;
}

// Max packet size libopus produces. From RFC 6716 §3.4: 1275 bytes is
// the maximum payload for a single Opus frame. We give it a comfortable
// margin and let the encoder write into a fixed-size scratch buffer.
constexpr size_t OPUS_MAX_PACKET = 4000;

// Convert any JS handle / value to an OpusEncoder*. We pack the pointer
// into a JS BigInt; the JS class wrapper holds onto it and passes it to
// each call. JSBigInt::toBigInt64 reads the heap-bigint without going
// through JSValue::toBigInt64 (which dereferences the global object).
OpusEncoder* asOpusEncoder(JSValue v)
{
    if (!v.isBigInt() || !v.isCell()) return nullptr;
    auto* big = jsCast<JSBigInt*>(v.asCell());
    return reinterpret_cast<OpusEncoder*>(JSBigInt::toBigInt64(big));
}

OpusDecoder* asOpusDecoder(JSValue v)
{
    if (!v.isBigInt() || !v.isCell()) return nullptr;
    auto* big = jsCast<JSBigInt*>(v.asCell());
    return reinterpret_cast<OpusDecoder*>(JSBigInt::toBigInt64(big));
}

} // anonymous namespace

JSC_DEFINE_HOST_FUNCTION(functionCreateOpusEncoder,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue optsArg = callFrame->argument(0);
    if (!optsArg.isObject()) {
        throwTypeError(globalObject, scope, "createOpusEncoder: opts must be an object"_s);
        return {};
    }
    auto* optsObj = asObject(optsArg);

    JSValue sampleRateVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "sampleRate"_s));
    JSValue channelsVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    JSValue bitrateVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "bitrate"_s));
    RETURN_IF_EXCEPTION(scope, {});

    int sampleRate = sampleRateVal.toInt32(globalObject);
    int channels = channelsVal.toInt32(globalObject);
    if (!isValidOpusRate(sampleRate)) {
        throwTypeError(globalObject, scope, "createOpusEncoder: sampleRate must be 8000, 12000, 16000, 24000, or 48000"_s);
        return {};
    }
    if (channels != 1 && channels != 2) {
        throwTypeError(globalObject, scope, "createOpusEncoder: channels must be 1 or 2"_s);
        return {};
    }

    int err = OPUS_OK;
    OpusEncoder* enc = opus_encoder_create(sampleRate, channels, OPUS_APPLICATION_VOIP, &err);
    if (!enc || err != OPUS_OK) {
        if (enc) opus_encoder_destroy(enc);
        throwTypeError(globalObject, scope, makeString("createOpusEncoder: libopus init failed: "_s, String::fromUTF8(opus_strerror(err))));
        return {};
    }

    if (bitrateVal.isNumber()) {
        int bitrate = bitrateVal.toInt32(globalObject);
        if (bitrate < 500 || bitrate > 512000) {
            opus_encoder_destroy(enc);
            throwTypeError(globalObject, scope, "createOpusEncoder: bitrate must be in [500, 512000]"_s);
            return {};
        }
        opus_encoder_ctl(enc, OPUS_SET_BITRATE(bitrate));
    }

    return JSValue::encode(JSC::JSBigInt::createFrom(globalObject, reinterpret_cast<int64_t>(enc)));
}

JSC_DEFINE_HOST_FUNCTION(functionDestroyOpusEncoder,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    OpusEncoder* enc = asOpusEncoder(callFrame->argument(0));
    if (enc) opus_encoder_destroy(enc);
    return JSValue::encode(jsUndefined());
}

JSC_DEFINE_HOST_FUNCTION(functionOpusEncode,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    OpusEncoder* enc = asOpusEncoder(callFrame->argument(0));
    if (!enc) {
        throwTypeError(globalObject, scope, "opusEncode: encoder handle is invalid (closed?)"_s);
        return {};
    }

    JSValue framesArg = callFrame->argument(1);
    JSValue frameSizeArg = callFrame->argument(2);
    if (!framesArg.isCell() || framesArg.asCell()->type() != JSC::Float32ArrayType) {
        throwTypeError(globalObject, scope, "opusEncode: samples must be a Float32Array"_s);
        return {};
    }
    auto* view = jsCast<JSC::JSArrayBufferView*>(framesArg.asCell());
    const float* samples = static_cast<const float*>(view->vector());
    if (!samples) {
        throwTypeError(globalObject, scope, "opusEncode: samples buffer is detached"_s);
        return {};
    }
    int frameSize = frameSizeArg.toInt32(globalObject);
    if (frameSize <= 0) {
        throwTypeError(globalObject, scope, "opusEncode: frameSize must be > 0"_s);
        return {};
    }

    uint8_t scratch[OPUS_MAX_PACKET];
    int written = opus_encode_float(enc, samples, frameSize, scratch, OPUS_MAX_PACKET);
    if (written < 0) {
        throwTypeError(globalObject, scope, makeString("opusEncode: libopus error: "_s, String::fromUTF8(opus_strerror(written))));
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    auto* result = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, static_cast<size_t>(written));
    RETURN_IF_EXCEPTION(scope, {});
    if (written > 0) std::memcpy(result->vector(), scratch, static_cast<size_t>(written));
    return JSValue::encode(result);
}

JSC_DEFINE_HOST_FUNCTION(functionCreateOpusDecoder,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue optsArg = callFrame->argument(0);
    if (!optsArg.isObject()) {
        throwTypeError(globalObject, scope, "createOpusDecoder: opts must be an object"_s);
        return {};
    }
    auto* optsObj = asObject(optsArg);

    JSValue sampleRateVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "sampleRate"_s));
    JSValue channelsVal = optsObj->get(globalObject, JSC::Identifier::fromString(vm, "channels"_s));
    RETURN_IF_EXCEPTION(scope, {});

    int sampleRate = sampleRateVal.toInt32(globalObject);
    int channels = channelsVal.toInt32(globalObject);
    if (!isValidOpusRate(sampleRate)) {
        throwTypeError(globalObject, scope, "createOpusDecoder: sampleRate must be 8000, 12000, 16000, 24000, or 48000"_s);
        return {};
    }
    if (channels != 1 && channels != 2) {
        throwTypeError(globalObject, scope, "createOpusDecoder: channels must be 1 or 2"_s);
        return {};
    }

    int err = OPUS_OK;
    OpusDecoder* dec = opus_decoder_create(sampleRate, channels, &err);
    if (!dec || err != OPUS_OK) {
        if (dec) opus_decoder_destroy(dec);
        throwTypeError(globalObject, scope, makeString("createOpusDecoder: libopus init failed: "_s, String::fromUTF8(opus_strerror(err))));
        return {};
    }

    return JSValue::encode(JSC::JSBigInt::createFrom(globalObject, reinterpret_cast<int64_t>(dec)));
}

JSC_DEFINE_HOST_FUNCTION(functionDestroyOpusDecoder,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    OpusDecoder* dec = asOpusDecoder(callFrame->argument(0));
    if (dec) opus_decoder_destroy(dec);
    return JSValue::encode(jsUndefined());
}

JSC_DEFINE_HOST_FUNCTION(functionOpusDecode,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    OpusDecoder* dec = asOpusDecoder(callFrame->argument(0));
    if (!dec) {
        throwTypeError(globalObject, scope, "opusDecode: decoder handle is invalid (closed?)"_s);
        return {};
    }

    JSValue packetArg = callFrame->argument(1);
    JSValue frameSizeArg = callFrame->argument(2);
    JSValue channelsArg = callFrame->argument(3);
    if (!packetArg.isCell() || packetArg.asCell()->type() != JSC::Uint8ArrayType) {
        throwTypeError(globalObject, scope, "opusDecode: packet must be a Uint8Array"_s);
        return {};
    }
    auto* view = jsCast<JSC::JSArrayBufferView*>(packetArg.asCell());
    const uint8_t* packet = static_cast<const uint8_t*>(view->vector());
    if (!packet) {
        throwTypeError(globalObject, scope, "opusDecode: packet buffer is detached"_s);
        return {};
    }
    const size_t packetLen = view->length();
    int frameSize = frameSizeArg.toInt32(globalObject);
    int channels = channelsArg.toInt32(globalObject);
    if (frameSize <= 0) {
        throwTypeError(globalObject, scope, "opusDecode: frameSize must be > 0"_s);
        return {};
    }
    if (channels != 1 && channels != 2) {
        throwTypeError(globalObject, scope, "opusDecode: channels must be 1 or 2"_s);
        return {};
    }

    std::vector<float> outBuf(static_cast<size_t>(frameSize) * channels);
    int decoded = opus_decode_float(dec, packet, static_cast<opus_int32>(packetLen),
        outBuf.data(), frameSize, /* decode_fec */ 0);
    if (decoded < 0) {
        throwTypeError(globalObject, scope, makeString("opusDecode: libopus error: "_s, String::fromUTF8(opus_strerror(decoded))));
        return {};
    }

    const size_t outSamples = static_cast<size_t>(decoded) * channels;
    Structure* structure = globalObject->typedArrayStructure(JSC::TypeFloat32, false);
    auto* result = JSC::JSFloat32Array::createUninitialized(globalObject, structure, outSamples);
    RETURN_IF_EXCEPTION(scope, {});
    if (outSamples > 0) {
        std::memcpy(result->vector(), outBuf.data(), outSamples * sizeof(float));
    }
    return JSValue::encode(result);
}

JSC::JSObject* createParabunAudioCodecs(JSC::JSGlobalObject* globalObject)
{
    auto& vm = JSC::getVM(globalObject);
    JSC::JSObject* object = JSC::constructEmptyObject(vm, globalObject->nullPrototypeObjectStructure());
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "createOpusEncoder"_s), 1,
        functionCreateOpusEncoder, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "destroyOpusEncoder"_s), 1,
        functionDestroyOpusEncoder, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "opusEncode"_s), 3,
        functionOpusEncode, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "createOpusDecoder"_s), 1,
        functionCreateOpusDecoder, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "destroyOpusDecoder"_s), 1,
        functionDestroyOpusDecoder, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "opusDecode"_s), 4,
        functionOpusDecode, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    return object;
}

} // namespace Bun
