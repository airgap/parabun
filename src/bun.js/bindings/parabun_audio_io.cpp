// Parabun: native audio I/O bindings for `para:audio` capture / playback.
//
// v1: ALSA on Linux. CoreAudio (macOS) and WASAPI (Windows) follow on top
// of the same JS surface in subsequent commits. ALSA is the right first
// target because the embedded bring-up runs on Pi 5 / Jetson + USB headset.
//
// Format on the wire is S16_LE (16-bit signed little-endian). Hardware
// universally supports it; the C++ layer converts to Float32 in [-1, 1]
// on the way to JS, and back on the way down. Direct float capture
// (SND_PCM_FORMAT_FLOAT_LE) exists on better hardware but isn't worth the
// negotiation complexity for v1.
//
// JS surface (called from src/js/bun/audio.ts):
//   listDevices() → { input: [...], output: [...] }
//   openCapture(device, sampleRate, channels, periodFrames, bufferPeriods)
//     → BigInt handle (PCM*)
//   captureRead(handle, frames) → { samples: Float32Array, overrun: bool, ts: ms }
//   closeCapture(handle)
//   openPlayback(device, sampleRate, channels, periodFrames, bufferPeriods)
//     → BigInt handle (PCM*)
//   playbackWrite(handle, samples) → frames written
//   playbackDrain(handle)
//   closePlayback(handle)

#include "root.h"
#include "parabun_audio_io.h"

#include <JavaScriptCore/CallData.h>
#include <JavaScriptCore/JSArray.h>
#include <JavaScriptCore/JSBigInt.h>
#include <JavaScriptCore/JSCInlines.h>
#include <JavaScriptCore/JSGenericTypedArrayViewInlines.h>
#include <JavaScriptCore/JSObject.h>
#include <JavaScriptCore/JSTypedArrays.h>
#include <JavaScriptCore/ObjectConstructor.h>
#include <JavaScriptCore/TypedArrayType.h>

#include "ZigGlobalObject.h"

#include <cstdint>
#include <cstdio>
#include <cstring>
#include <string>
#include <vector>

#if defined(__linux__)
#include <alsa/asoundlib.h>
#endif

namespace Bun {

using namespace JSC;

namespace {

#if defined(__linux__)

struct PCM {
    snd_pcm_t* handle = nullptr;
    unsigned int sampleRate = 0;
    unsigned int channels = 0;
    snd_pcm_uframes_t periodFrames = 0;
    snd_pcm_uframes_t bufferFrames = 0;
    bool capture = false;

    ~PCM()
    {
        if (handle) {
            snd_pcm_drain(handle);
            snd_pcm_close(handle);
            handle = nullptr;
        }
    }
};

PCM* asPCM(JSValue v)
{
    if (!v.isBigInt() || !v.isCell()) return nullptr;
    auto* big = jsCast<JSBigInt*>(v.asCell());
    return reinterpret_cast<PCM*>(JSBigInt::toBigInt64(big));
}

// Configure hardware params on an opened PCM. Returns null on success or
// a borrowed error string. Caller throws — keeps the JSC throw path out
// of this helper so it stays unit-testable.
const char* configurePcm(snd_pcm_t* pcm, unsigned int& sampleRate, unsigned int channels,
    snd_pcm_uframes_t& periodFrames, unsigned int bufferPeriods,
    snd_pcm_uframes_t* outBufferFrames = nullptr)
{
    snd_pcm_hw_params_t* params;
    snd_pcm_hw_params_alloca(&params);

    if (snd_pcm_hw_params_any(pcm, params) < 0) return "snd_pcm_hw_params_any";
    if (snd_pcm_hw_params_set_access(pcm, params, SND_PCM_ACCESS_RW_INTERLEAVED) < 0)
        return "set_access(RW_INTERLEAVED)";
    if (snd_pcm_hw_params_set_format(pcm, params, SND_PCM_FORMAT_S16_LE) < 0)
        return "set_format(S16_LE)";
    if (snd_pcm_hw_params_set_channels(pcm, params, channels) < 0)
        return "set_channels";

    int dir = 0;
    if (snd_pcm_hw_params_set_rate_near(pcm, params, &sampleRate, &dir) < 0)
        return "set_rate_near";
    dir = 0;
    if (snd_pcm_hw_params_set_period_size_near(pcm, params, &periodFrames, &dir) < 0)
        return "set_period_size_near";
    snd_pcm_uframes_t bufferFrames = periodFrames * bufferPeriods;
    if (snd_pcm_hw_params_set_buffer_size_near(pcm, params, &bufferFrames) < 0)
        return "set_buffer_size_near";

    if (snd_pcm_hw_params(pcm, params) < 0) return "snd_pcm_hw_params";
    // ALSA may have rounded our buffer-size request to the nearest hardware-
    // compatible value. The caller needs the post-negotiation count to
    // compute queuedFrames = bufferFrames - avail accurately.
    if (outBufferFrames) *outBufferFrames = bufferFrames;
    return nullptr;
}

// Return the current monotonic time in ms (matches kernel V4L2 timestamps
// in spirit — they aren't on the same epoch but both move at wall time).
double monotonicMs()
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return static_cast<double>(ts.tv_sec) * 1000.0 + static_cast<double>(ts.tv_nsec) / 1e6;
}

#endif // __linux__

} // anonymous namespace

// ─── listDevices ───────────────────────────────────────────────────────────
// Returns { input: [{ id, name, channels, rates }], output: [...] }.
// `rates` is a probe-not-promise — we report the standard rates ALSA
// confirms the hardware can negotiate. Final rate is decided at open time.
JSC_DEFINE_HOST_FUNCTION(functionListDevices,
    (JSGlobalObject * globalObject, CallFrame*))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSObject* result = constructEmptyObject(globalObject, globalObject->objectPrototype());
    JSArray* inputArr = constructEmptyArray(globalObject, nullptr);
    JSArray* outputArr = constructEmptyArray(globalObject, nullptr);
    result->putDirect(vm, Identifier::fromString(vm, "input"_s), inputArr);
    result->putDirect(vm, Identifier::fromString(vm, "output"_s), outputArr);
    RETURN_IF_EXCEPTION(scope, {});

#if defined(__linux__)
    static const unsigned int CANDIDATE_RATES[] = { 8000, 16000, 22050, 32000, 44100, 48000, 88200, 96000 };

    auto fillEntry = [&](snd_ctl_t* ctl, int card, int dev, snd_pcm_stream_t stream,
                         const char* cardName, JSArray* arr, unsigned int& nextIndex) {
        snd_pcm_info_t* pinfo;
        snd_pcm_info_alloca(&pinfo);
        snd_pcm_info_set_device(pinfo, static_cast<unsigned int>(dev));
        snd_pcm_info_set_subdevice(pinfo, 0);
        snd_pcm_info_set_stream(pinfo, stream);
        if (snd_ctl_pcm_info(ctl, pinfo) < 0) return;

        char id[64];
        std::snprintf(id, sizeof(id), "hw:%d,%d", card, dev);

        // Probe channel + rate support by opening the PCM read-only and
        // querying hw_params. snd_pcm_open with SND_PCM_NONBLOCK avoids
        // contention if another app holds the device.
        snd_pcm_t* pcm = nullptr;
        if (snd_pcm_open(&pcm, id, stream, SND_PCM_NONBLOCK) < 0) return;
        snd_pcm_hw_params_t* hp;
        snd_pcm_hw_params_alloca(&hp);
        snd_pcm_hw_params_any(pcm, hp);

        unsigned int minCh = 0, maxCh = 0;
        snd_pcm_hw_params_get_channels_min(hp, &minCh);
        snd_pcm_hw_params_get_channels_max(hp, &maxCh);
        unsigned int channels = maxCh > 0 ? maxCh : minCh;

        JSObject* obj = constructEmptyObject(globalObject, globalObject->objectPrototype());
        obj->putDirect(vm, Identifier::fromString(vm, "id"_s),
            jsString(vm, String::fromUTF8(id)));
        // Compose human name as "<card>: <pcm-name>".
        const char* pcmName = snd_pcm_info_get_name(pinfo);
        std::string fullName = cardName;
        if (pcmName) {
            fullName += ": ";
            fullName += pcmName;
        }
        obj->putDirect(vm, Identifier::fromString(vm, "name"_s),
            jsString(vm, String::fromUTF8(fullName.c_str())));
        obj->putDirect(vm, Identifier::fromString(vm, "channels"_s), jsNumber(channels));

        JSArray* ratesArr = constructEmptyArray(globalObject, nullptr);
        unsigned int rIdx = 0;
        for (unsigned int candidate : CANDIDATE_RATES) {
            if (snd_pcm_hw_params_test_rate(pcm, hp, candidate, 0) == 0) {
                ratesArr->putDirectIndex(globalObject, rIdx++, jsNumber(candidate));
            }
        }
        obj->putDirect(vm, Identifier::fromString(vm, "rates"_s), ratesArr);
        snd_pcm_close(pcm);

        arr->putDirectIndex(globalObject, nextIndex++, obj);
    };

    int card = -1;
    unsigned int inputIdx = 0, outputIdx = 0;
    while (snd_card_next(&card) == 0 && card >= 0) {
        char ctlName[32];
        std::snprintf(ctlName, sizeof(ctlName), "hw:%d", card);
        snd_ctl_t* ctl = nullptr;
        if (snd_ctl_open(&ctl, ctlName, 0) < 0) continue;

        snd_ctl_card_info_t* info;
        snd_ctl_card_info_alloca(&info);
        if (snd_ctl_card_info(ctl, info) < 0) {
            snd_ctl_close(ctl);
            continue;
        }
        const char* cardLongName = snd_ctl_card_info_get_name(info);
        if (!cardLongName) cardLongName = "unknown";

        int dev = -1;
        while (snd_ctl_pcm_next_device(ctl, &dev) == 0 && dev >= 0) {
            fillEntry(ctl, card, dev, SND_PCM_STREAM_CAPTURE, cardLongName, inputArr, inputIdx);
            fillEntry(ctl, card, dev, SND_PCM_STREAM_PLAYBACK, cardLongName, outputArr, outputIdx);
        }
        snd_ctl_close(ctl);
    }
#endif

    return JSValue::encode(result);
}

#if defined(__linux__)
// Open helper used by both capture and playback paths.
static PCM* openPcm(JSGlobalObject* globalObject, ThrowScope& scope,
    const char* device, snd_pcm_stream_t stream, unsigned int sampleRate,
    unsigned int channels, snd_pcm_uframes_t periodFrames, unsigned int bufferPeriods)
{
    snd_pcm_t* pcm = nullptr;
    int err = snd_pcm_open(&pcm, device, stream, 0);
    if (err < 0) {
        throwTypeError(globalObject, scope,
            makeString("snd_pcm_open("_s, String::fromUTF8(device), "): "_s,
                String::fromUTF8(snd_strerror(err))));
        return nullptr;
    }

    snd_pcm_uframes_t bufferFrames = 0;
    const char* what = configurePcm(pcm, sampleRate, channels, periodFrames, bufferPeriods, &bufferFrames);
    if (what) {
        snd_pcm_close(pcm);
        throwTypeError(globalObject, scope,
            makeString("configure PCM: "_s, String::fromUTF8(what)));
        return nullptr;
    }

    if (snd_pcm_prepare(pcm) < 0) {
        snd_pcm_close(pcm);
        throwTypeError(globalObject, scope, "snd_pcm_prepare failed"_s);
        return nullptr;
    }

    auto* p = new PCM();
    p->handle = pcm;
    p->sampleRate = sampleRate;
    p->channels = channels;
    p->periodFrames = periodFrames;
    p->bufferFrames = bufferFrames;
    p->capture = (stream == SND_PCM_STREAM_CAPTURE);
    return p;
}
#endif

// ─── openCapture / openPlayback ────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionOpenCapture,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "para:audio capture not yet implemented on this platform"_s);
    return {};
#else
    if (callFrame->argumentCount() < 5) {
        throwTypeError(globalObject, scope,
            "openCapture(device, sampleRate, channels, periodFrames, bufferPeriods)"_s);
        return {};
    }
    String dev = callFrame->argument(0).toWTFString(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    unsigned int rate = callFrame->argument(1).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    unsigned int channels = callFrame->argument(2).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    snd_pcm_uframes_t period = callFrame->argument(3).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    unsigned int bufPeriods = callFrame->argument(4).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});

    auto* p = openPcm(globalObject, scope, dev.utf8().data(),
        SND_PCM_STREAM_CAPTURE, rate, channels, period, bufPeriods);
    if (!p) return {};

    return JSValue::encode(JSBigInt::createFrom(globalObject,
        reinterpret_cast<int64_t>(p)));
#endif
}

JSC_DEFINE_HOST_FUNCTION(functionOpenPlayback,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "para:audio playback not yet implemented on this platform"_s);
    return {};
#else
    if (callFrame->argumentCount() < 5) {
        throwTypeError(globalObject, scope,
            "openPlayback(device, sampleRate, channels, periodFrames, bufferPeriods)"_s);
        return {};
    }
    String dev = callFrame->argument(0).toWTFString(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    unsigned int rate = callFrame->argument(1).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    unsigned int channels = callFrame->argument(2).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    snd_pcm_uframes_t period = callFrame->argument(3).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    unsigned int bufPeriods = callFrame->argument(4).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});

    auto* p = openPcm(globalObject, scope, dev.utf8().data(),
        SND_PCM_STREAM_PLAYBACK, rate, channels, period, bufPeriods);
    if (!p) return {};

    return JSValue::encode(JSBigInt::createFrom(globalObject,
        reinterpret_cast<int64_t>(p)));
#endif
}

// ─── captureRead ───────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionCaptureRead,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "para:audio capture not yet implemented on this platform"_s);
    return {};
#else
    auto* p = asPCM(callFrame->argument(0));
    if (!p || !p->handle || !p->capture) {
        throwTypeError(globalObject, scope, "captureRead: invalid handle"_s);
        return {};
    }
    snd_pcm_uframes_t want = static_cast<snd_pcm_uframes_t>(
        callFrame->argument(1).toUInt32(globalObject));
    RETURN_IF_EXCEPTION(scope, {});
    if (want == 0) want = p->periodFrames;

    // Read into a scratch S16 buffer, convert to float on the way to JS.
    std::vector<int16_t> scratch(want * p->channels);
    bool overrun = false;

    snd_pcm_sframes_t got = snd_pcm_readi(p->handle, scratch.data(), want);
    if (got == -EPIPE) {
        // Overrun (capture analogue of underrun). Recover and try once more.
        overrun = true;
        snd_pcm_prepare(p->handle);
        got = snd_pcm_readi(p->handle, scratch.data(), want);
    }
    if (got == -EAGAIN) {
        // Non-blocking would have blocked. We're in blocking mode so this
        // shouldn't happen; report 0 frames.
        got = 0;
    }
    if (got < 0) {
        throwTypeError(globalObject, scope,
            makeString("snd_pcm_readi: "_s,
                String::fromUTF8(snd_strerror(static_cast<int>(got)))));
        return {};
    }

    size_t outSamples = static_cast<size_t>(got) * p->channels;
    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* arr = JSC::JSFloat32Array::createUninitialized(globalObject,
        zigGlobal->typedArrayStructure(JSC::TypeFloat32, false), outSamples);
    RETURN_IF_EXCEPTION(scope, {});
    auto* dst = static_cast<float*>(arr->vector());
    constexpr float scale = 1.0f / 32768.0f;
    for (size_t i = 0; i < outSamples; i++) {
        dst[i] = static_cast<float>(scratch[i]) * scale;
    }

    JSObject* result = constructEmptyObject(globalObject, globalObject->objectPrototype());
    result->putDirect(vm, Identifier::fromString(vm, "samples"_s), arr);
    result->putDirect(vm, Identifier::fromString(vm, "frames"_s), jsNumber(static_cast<double>(got)));
    result->putDirect(vm, Identifier::fromString(vm, "overrun"_s), jsBoolean(overrun));
    result->putDirect(vm, Identifier::fromString(vm, "timestampMs"_s), jsNumber(monotonicMs()));
    return JSValue::encode(result);
#endif
}

// ─── playbackWrite ─────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionPlaybackWrite,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "para:audio playback not yet implemented on this platform"_s);
    return {};
#else
    auto* p = asPCM(callFrame->argument(0));
    if (!p || !p->handle || p->capture) {
        throwTypeError(globalObject, scope, "playbackWrite: invalid handle"_s);
        return {};
    }
    JSValue samplesArg = callFrame->argument(1);
    if (!samplesArg.isCell() || samplesArg.asCell()->type() != JSC::Float32ArrayType) {
        throwTypeError(globalObject, scope, "playbackWrite: samples must be Float32Array"_s);
        return {};
    }
    auto* view = jsCast<JSC::JSArrayBufferView*>(samplesArg.asCell());
    auto* src = static_cast<const float*>(view->vector());
    size_t totalSamples = view->length();
    if (totalSamples == 0) return JSValue::encode(jsNumber(0));
    if (totalSamples % p->channels != 0) {
        throwTypeError(globalObject, scope,
            "playbackWrite: sample count must be a multiple of channels"_s);
        return {};
    }
    size_t totalFrames = totalSamples / p->channels;

    // Convert float → s16 in a scratch buffer. Saturating clamp.
    std::vector<int16_t> scratch(totalSamples);
    for (size_t i = 0; i < totalSamples; i++) {
        float v = src[i];
        if (v > 1.0f) v = 1.0f;
        else if (v < -1.0f) v = -1.0f;
        scratch[i] = static_cast<int16_t>(v * 32767.0f);
    }

    size_t framesWritten = 0;
    while (framesWritten < totalFrames) {
        snd_pcm_sframes_t n = snd_pcm_writei(p->handle,
            scratch.data() + framesWritten * p->channels,
            totalFrames - framesWritten);
        if (n == -EPIPE) {
            snd_pcm_prepare(p->handle);
            continue;
        }
        if (n < 0) {
            throwTypeError(globalObject, scope,
                makeString("snd_pcm_writei: "_s,
                    String::fromUTF8(snd_strerror(static_cast<int>(n)))));
            return {};
        }
        framesWritten += static_cast<size_t>(n);
    }

    return JSValue::encode(jsNumber(static_cast<double>(framesWritten)));
#endif
}

// ─── playbackDrain ─────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionPlaybackDrain,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if defined(__linux__)
    auto* p = asPCM(callFrame->argument(0));
    if (p && p->handle && !p->capture) {
        snd_pcm_drain(p->handle);
    }
#endif
    return JSValue::encode(jsUndefined());
}

// ─── playbackQueuedFrames (LYK-746: spk.queuedMs signal source) ────────────
// Returns the number of frames currently sitting in the ALSA buffer waiting
// to be played. Computed as `bufferFrames - avail`, clamped to >= 0. Useful
// for backpressure decisions ("can I write a 1024-frame chunk without
// blocking?") and for the spk.queuedMs reactive signal.
JSC_DEFINE_HOST_FUNCTION(functionPlaybackQueuedFrames,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if defined(__linux__)
    auto* p = asPCM(callFrame->argument(0));
    if (!p || !p->handle || p->capture) return JSValue::encode(jsNumber(0));
    snd_pcm_sframes_t avail = snd_pcm_avail(p->handle);
    if (avail < 0) {
        // Underrun / xrun — bursting through these would be a perf bug, not
        // a queue depth question. Report zero so callers don't spin.
        return JSValue::encode(jsNumber(0));
    }
    snd_pcm_sframes_t queued = static_cast<snd_pcm_sframes_t>(p->bufferFrames) - avail;
    if (queued < 0) queued = 0;
    return JSValue::encode(jsNumber(static_cast<double>(queued)));
#else
    return JSValue::encode(jsNumber(0));
#endif
}

// ─── playbackDrop (barge-in: discard pending audio) ────────────────────────
// Unlike playbackDrain (waits for the buffer to play out), playbackDrop
// throws away whatever is queued in ALSA's buffer immediately and re-prepares
// the stream so subsequent playbackWrite calls work. Used by `bot.speak()`
// to cut TTS short the moment VAD detects user speech (LYK-735).
JSC_DEFINE_HOST_FUNCTION(functionPlaybackDrop,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if defined(__linux__)
    auto* p = asPCM(callFrame->argument(0));
    if (p && p->handle && !p->capture) {
        snd_pcm_drop(p->handle);
        // After a drop the PCM is in SND_PCM_STATE_SETUP; prepare it so
        // future playbackWrite() calls don't fail with -EBADFD.
        snd_pcm_prepare(p->handle);
    }
#endif
    return JSValue::encode(jsUndefined());
}

// ─── close (capture + playback) ────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionClosePcm,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if defined(__linux__)
    auto* p = asPCM(callFrame->argument(0));
    if (p) {
        delete p; // PCM dtor drains + closes the snd_pcm_t.
    }
#endif
    return JSValue::encode(jsUndefined());
}

// ─── factory ───────────────────────────────────────────────────────────────
JSC::JSObject* createParabunAudioIO(JSC::JSGlobalObject* globalObject)
{
    auto& vm = JSC::getVM(globalObject);
    JSC::JSObject* object = JSC::constructEmptyObject(vm, globalObject->nullPrototypeObjectStructure());
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "listDevices"_s), 0,
        functionListDevices, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "openCapture"_s), 5,
        functionOpenCapture, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "openPlayback"_s), 5,
        functionOpenPlayback, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "captureRead"_s), 2,
        functionCaptureRead, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "playbackWrite"_s), 2,
        functionPlaybackWrite, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "playbackDrain"_s), 1,
        functionPlaybackDrain, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "playbackDrop"_s), 1,
        functionPlaybackDrop, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "playbackQueuedFrames"_s), 1,
        functionPlaybackQueuedFrames, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "closePcm"_s), 1,
        functionClosePcm, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    return object;
}

} // namespace Bun
