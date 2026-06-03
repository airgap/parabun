// Parabun: native camera-capture bindings for `parabun:camera`.
//
// v1: V4L2 on Linux. AVFoundation + Media Foundation come on top of the
// same JS surface in follow-ups. The Linux path covers:
//   - /dev/video* enumeration (via /sys/class/video4linux/)
//   - VIDIOC_ENUM_FMT / FRAMESIZES / FRAMEINTERVALS to advertise capability
//   - VIDIOC_S_FMT + REQBUFS + mmap + STREAMON streaming capture
//   - VIDIOC_DQBUF / QBUF round-robin ring; one frame returned as a Uint8Array
//     per captureNext call (data is copied out so the kernel buffer can
//     be re-queued immediately).
//
// JS surface (called from src/js/bun/camera.ts):
//   enumerateDevices() → Array<{ path, name, driver, caps[] }>
//   queryFormats(path) → Array<{ format, width, height, fpsNum, fpsDen }>
//   openDevice(path, format, width, height, bufferCount) → BigInt handle
//   closeDevice(handle) → void
//   captureNext(handle) → { data, width, height, format, timestampMs, sequence }
//   formatToRgba(data, format, width, height) → Uint8Array  (YUYV/RGB24 fast path)
//
// On non-Linux every entry point throws "parabun:camera not yet implemented on
// this platform". macOS / Windows backends are scaffolded later.

#include "root.h"
#include "parabun_camera.h"

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
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <linux/videodev2.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <sys/select.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>
#endif

namespace Bun {

using namespace JSC;

namespace {

#if defined(__linux__)

// Retry an ioctl on EINTR — common for V4L2 calls under signal pressure.
int xioctl(int fd, unsigned long req, void* arg)
{
    int r;
    do {
        r = ::ioctl(fd, req, arg);
    } while (r == -1 && errno == EINTR);
    return r;
}

// Convert one of the four pixel-format strings the JS layer accepts into a
// V4L2 fourcc. Returns 0 on unknown.
uint32_t fourccFromString(const std::string& s)
{
    if (s == "yuyv") return V4L2_PIX_FMT_YUYV;
    if (s == "mjpg") return V4L2_PIX_FMT_MJPEG;
    if (s == "nv12") return V4L2_PIX_FMT_NV12;
    if (s == "rgb24") return V4L2_PIX_FMT_RGB24;
    return 0;
}

const char* stringFromFourcc(uint32_t fcc)
{
    switch (fcc) {
        case V4L2_PIX_FMT_YUYV: return "yuyv";
        case V4L2_PIX_FMT_MJPEG: return "mjpg";
        case V4L2_PIX_FMT_NV12: return "nv12";
        case V4L2_PIX_FMT_RGB24: return "rgb24";
        default: return nullptr;
    }
}

struct Buffer {
    void* ptr;
    size_t length;
};

// One open V4L2 capture session. The JS layer holds a pointer to this in
// a BigInt and passes it back on each call. close() is idempotent.
struct CameraSession {
    int fd = -1;
    std::vector<Buffer> buffers;
    uint32_t fourcc = 0;
    uint32_t width = 0;
    uint32_t height = 0;
    bool streaming = false;

    ~CameraSession() { close(); }

    void close()
    {
        if (streaming && fd >= 0) {
            v4l2_buf_type type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
            xioctl(fd, VIDIOC_STREAMOFF, &type);
            streaming = false;
        }
        for (auto& b : buffers) {
            if (b.ptr && b.ptr != MAP_FAILED) ::munmap(b.ptr, b.length);
        }
        buffers.clear();
        if (fd >= 0) {
            ::close(fd);
            fd = -1;
        }
    }
};

CameraSession* asSession(JSValue v)
{
    if (!v.isBigInt() || !v.isCell()) return nullptr;
    auto* big = dynamicDowncast<JSBigInt>(v.asCell());
    return reinterpret_cast<CameraSession*>(JSBigInt::toBigInt64(big));
}

// Read a file's contents into a string (small files only — used for
// /sys/class/video4linux/*/name and similar).
std::string slurp(const char* path)
{
    int fd = ::open(path, O_RDONLY);
    if (fd < 0) return {};
    char buf[256];
    ssize_t n = ::read(fd, buf, sizeof(buf) - 1);
    ::close(fd);
    if (n <= 0) return {};
    while (n > 0 && (buf[n - 1] == '\n' || buf[n - 1] == ' ')) n--;
    buf[n] = 0;
    return std::string(buf, static_cast<size_t>(n));
}

#endif // __linux__

} // anonymous namespace

// ─── enumerateDevices ──────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionEnumerateDevices,
    (JSGlobalObject * globalObject, CallFrame*))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSArray* result = constructEmptyArray(globalObject, nullptr);
    RETURN_IF_EXCEPTION(scope, {});

#if defined(__linux__)
    DIR* dir = ::opendir("/sys/class/video4linux");
    if (!dir) return JSValue::encode(result);

    struct dirent* ent;
    unsigned int idx = 0;
    while ((ent = ::readdir(dir)) != nullptr) {
        if (std::strncmp(ent->d_name, "video", 5) != 0) continue;

        std::string sysPath = std::string("/sys/class/video4linux/") + ent->d_name;
        std::string name = slurp((sysPath + "/name").c_str());
        std::string devPath = std::string("/dev/") + ent->d_name;

        // Open + QUERYCAP to filter out output / metadata devices.
        int fd = ::open(devPath.c_str(), O_RDWR | O_NONBLOCK);
        if (fd < 0) continue;

        v4l2_capability cap;
        std::memset(&cap, 0, sizeof(cap));
        if (xioctl(fd, VIDIOC_QUERYCAP, &cap) < 0) {
            ::close(fd);
            continue;
        }

        // Only consider video-capture devices. Some webcams (UVC) expose
        // multiple /dev/video* nodes — one for capture, others for metadata
        // or M2M; skip the non-capture ones.
        uint32_t caps = cap.device_caps ? cap.device_caps : cap.capabilities;
        if (!(caps & V4L2_CAP_VIDEO_CAPTURE)) {
            ::close(fd);
            continue;
        }

        JSObject* obj = constructEmptyObject(globalObject, globalObject->objectPrototype());
        obj->putDirect(vm, Identifier::fromString(vm, "path"_s),
            jsString(vm, String::fromUTF8(devPath.c_str())));
        obj->putDirect(vm, Identifier::fromString(vm, "name"_s),
            jsString(vm, String::fromUTF8(name.c_str())));
        obj->putDirect(vm, Identifier::fromString(vm, "driver"_s),
            jsString(vm, String::fromUTF8(reinterpret_cast<const char*>(cap.driver))));

        JSArray* capsArr = constructEmptyArray(globalObject, nullptr);
        unsigned int cIdx = 0;
        if (caps & V4L2_CAP_VIDEO_CAPTURE)
            capsArr->putDirectIndex(globalObject, cIdx++, jsNontrivialString(vm, "video_capture"_s));
        if (caps & V4L2_CAP_STREAMING)
            capsArr->putDirectIndex(globalObject, cIdx++, jsNontrivialString(vm, "streaming"_s));
        if (caps & V4L2_CAP_READWRITE)
            capsArr->putDirectIndex(globalObject, cIdx++, jsNontrivialString(vm, "readwrite"_s));
        obj->putDirect(vm, Identifier::fromString(vm, "caps"_s), capsArr);

        result->putDirectIndex(globalObject, idx++, obj);
        ::close(fd);
    }
    ::closedir(dir);
#endif // __linux__

    return JSValue::encode(result);
}

// ─── queryFormats ──────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionQueryFormats,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue pathArg = callFrame->argument(0);
    if (!pathArg.isString()) {
        throwTypeError(globalObject, scope, "queryFormats: path must be a string"_s);
        return {};
    }
    String pathStr = pathArg.toWTFString(globalObject);
    RETURN_IF_EXCEPTION(scope, {});

    JSArray* result = constructEmptyArray(globalObject, nullptr);
    RETURN_IF_EXCEPTION(scope, {});

#if defined(__linux__)
    auto pathUtf8 = pathStr.utf8();
    int fd = ::open(pathUtf8.data(), O_RDWR | O_NONBLOCK);
    if (fd < 0) {
        throwTypeError(globalObject, scope,
            makeString("queryFormats: cannot open "_s, pathStr,
                ": "_s, String::fromUTF8(::strerror(errno))));
        return {};
    }

    unsigned int idx = 0;
    v4l2_fmtdesc fmt;
    std::memset(&fmt, 0, sizeof(fmt));
    fmt.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
    for (uint32_t fIdx = 0;; fIdx++) {
        fmt.index = fIdx;
        if (xioctl(fd, VIDIOC_ENUM_FMT, &fmt) < 0) break;
        const char* fmtName = stringFromFourcc(fmt.pixelformat);
        if (!fmtName) continue; // skip unsupported formats

        v4l2_frmsizeenum sz;
        std::memset(&sz, 0, sizeof(sz));
        sz.pixel_format = fmt.pixelformat;
        for (uint32_t sIdx = 0;; sIdx++) {
            sz.index = sIdx;
            if (xioctl(fd, VIDIOC_ENUM_FRAMESIZES, &sz) < 0) break;
            // Only V4L2_FRMSIZE_TYPE_DISCRETE is reasonable here — webcams
            // almost always advertise discrete sizes; stepwise / continuous
            // are rare on UVC and would explode the listing.
            if (sz.type != V4L2_FRMSIZE_TYPE_DISCRETE) break;

            uint32_t w = sz.discrete.width, h = sz.discrete.height;

            v4l2_frmivalenum iv;
            std::memset(&iv, 0, sizeof(iv));
            iv.pixel_format = fmt.pixelformat;
            iv.width = w;
            iv.height = h;
            for (uint32_t iIdx = 0;; iIdx++) {
                iv.index = iIdx;
                if (xioctl(fd, VIDIOC_ENUM_FRAMEINTERVALS, &iv) < 0) break;
                if (iv.type != V4L2_FRMIVAL_TYPE_DISCRETE) break;

                JSObject* row = constructEmptyObject(globalObject, globalObject->objectPrototype());
                row->putDirect(vm, Identifier::fromString(vm, "format"_s),
                    jsString(vm, String::fromUTF8(fmtName)));
                row->putDirect(vm, Identifier::fromString(vm, "width"_s), jsNumber(w));
                row->putDirect(vm, Identifier::fromString(vm, "height"_s), jsNumber(h));
                // V4L2 reports interval (s = num/den), so fps = den/num.
                row->putDirect(vm, Identifier::fromString(vm, "fpsNum"_s),
                    jsNumber(iv.discrete.denominator));
                row->putDirect(vm, Identifier::fromString(vm, "fpsDen"_s),
                    jsNumber(iv.discrete.numerator));
                result->putDirectIndex(globalObject, idx++, row);
            }
        }
    }
    ::close(fd);
#endif

    return JSValue::encode(result);
}

// ─── openDevice ────────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionOpenDevice,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:camera capture not yet implemented on this platform"_s);
    return {};
#else
    if (callFrame->argumentCount() < 5) {
        throwTypeError(globalObject, scope,
            "openDevice(path, format, width, height, bufferCount)"_s);
        return {};
    }

    String pathStr = callFrame->argument(0).toWTFString(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    String fmtStr = callFrame->argument(1).toWTFString(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    int width = callFrame->argument(2).toInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    int height = callFrame->argument(3).toInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    int bufCount = callFrame->argument(4).toInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});

    if (bufCount < 2) bufCount = 2;
    if (bufCount > 16) bufCount = 16;

    uint32_t fourcc = fourccFromString(fmtStr.utf8().data());
    if (!fourcc) {
        throwTypeError(globalObject, scope,
            makeString("openDevice: unknown format "_s, fmtStr,
                " (yuyv|mjpg|nv12|rgb24)"_s));
        return {};
    }

    auto pathUtf8 = pathStr.utf8();
    int fd = ::open(pathUtf8.data(), O_RDWR);
    if (fd < 0) {
        throwTypeError(globalObject, scope,
            makeString("openDevice: open("_s, pathStr, "): "_s,
                String::fromUTF8(::strerror(errno))));
        return {};
    }

    auto* sess = new CameraSession();
    sess->fd = fd;

    // Negotiate format. The driver may adjust width/height to the closest
    // supported size — we read those back into the session.
    v4l2_format vf;
    std::memset(&vf, 0, sizeof(vf));
    vf.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
    vf.fmt.pix.width = static_cast<uint32_t>(width);
    vf.fmt.pix.height = static_cast<uint32_t>(height);
    vf.fmt.pix.pixelformat = fourcc;
    vf.fmt.pix.field = V4L2_FIELD_ANY;
    if (xioctl(fd, VIDIOC_S_FMT, &vf) < 0) {
        delete sess;
        throwTypeError(globalObject, scope,
            makeString("openDevice: VIDIOC_S_FMT: "_s,
                String::fromUTF8(::strerror(errno))));
        return {};
    }
    sess->fourcc = vf.fmt.pix.pixelformat;
    sess->width = vf.fmt.pix.width;
    sess->height = vf.fmt.pix.height;

    // Request mmap'd buffers.
    v4l2_requestbuffers req;
    std::memset(&req, 0, sizeof(req));
    req.count = static_cast<uint32_t>(bufCount);
    req.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
    req.memory = V4L2_MEMORY_MMAP;
    if (xioctl(fd, VIDIOC_REQBUFS, &req) < 0) {
        delete sess;
        throwTypeError(globalObject, scope,
            makeString("openDevice: VIDIOC_REQBUFS: "_s,
                String::fromUTF8(::strerror(errno))));
        return {};
    }
    if (req.count < 2) {
        delete sess;
        throwTypeError(globalObject, scope,
            "openDevice: kernel allocated fewer than 2 capture buffers"_s);
        return {};
    }

    sess->buffers.resize(req.count);
    for (uint32_t i = 0; i < req.count; i++) {
        v4l2_buffer b;
        std::memset(&b, 0, sizeof(b));
        b.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
        b.memory = V4L2_MEMORY_MMAP;
        b.index = i;
        if (xioctl(fd, VIDIOC_QUERYBUF, &b) < 0) {
            delete sess;
            throwTypeError(globalObject, scope,
                makeString("openDevice: VIDIOC_QUERYBUF: "_s,
                    String::fromUTF8(::strerror(errno))));
            return {};
        }
        void* ptr = ::mmap(nullptr, b.length, PROT_READ | PROT_WRITE, MAP_SHARED, fd, b.m.offset);
        if (ptr == MAP_FAILED) {
            delete sess;
            throwTypeError(globalObject, scope,
                makeString("openDevice: mmap: "_s, String::fromUTF8(::strerror(errno))));
            return {};
        }
        sess->buffers[i].ptr = ptr;
        sess->buffers[i].length = b.length;
        if (xioctl(fd, VIDIOC_QBUF, &b) < 0) {
            delete sess;
            throwTypeError(globalObject, scope,
                makeString("openDevice: initial VIDIOC_QBUF: "_s,
                    String::fromUTF8(::strerror(errno))));
            return {};
        }
    }

    v4l2_buf_type type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
    if (xioctl(fd, VIDIOC_STREAMON, &type) < 0) {
        delete sess;
        throwTypeError(globalObject, scope,
            makeString("openDevice: VIDIOC_STREAMON: "_s,
                String::fromUTF8(::strerror(errno))));
        return {};
    }
    sess->streaming = true;

    // Pack the session pointer into a JS BigInt — same pattern as opus.
    return JSValue::encode(JSBigInt::createFrom(globalObject,
        reinterpret_cast<int64_t>(sess)));
#endif
}

// ─── closeDevice ───────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionCloseDevice,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if defined(__linux__)
    auto* sess = asSession(callFrame->argument(0));
    if (sess) {
        sess->close();
        delete sess;
    }
#endif
    return JSValue::encode(jsUndefined());
}

// ─── captureNext ───────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionCaptureNext,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:camera capture not yet implemented on this platform"_s);
    return {};
#else
    auto* sess = asSession(callFrame->argument(0));
    if (!sess || sess->fd < 0) {
        throwTypeError(globalObject, scope, "captureNext: invalid or closed handle"_s);
        return {};
    }

    // Wait for a frame to be ready. select() blocks the JS thread — fine for
    // the v1 sync path; the async iterator wraps this with a worker so the
    // event loop stays responsive.
    int timeoutSec = callFrame->argumentCount() > 1
        ? std::max(0, callFrame->argument(1).toInt32(globalObject))
        : 5;
    RETURN_IF_EXCEPTION(scope, {});

    fd_set fds;
    FD_ZERO(&fds);
    FD_SET(sess->fd, &fds);
    struct timeval tv;
    tv.tv_sec = timeoutSec;
    tv.tv_usec = 0;
    int sret;
    do {
        sret = ::select(sess->fd + 1, &fds, nullptr, nullptr, &tv);
    } while (sret == -1 && errno == EINTR);
    if (sret < 0) {
        throwTypeError(globalObject, scope,
            makeString("captureNext: select: "_s,
                String::fromUTF8(::strerror(errno))));
        return {};
    }
    if (sret == 0) {
        throwTypeError(globalObject, scope, "captureNext: timeout"_s);
        return {};
    }

    v4l2_buffer b;
    std::memset(&b, 0, sizeof(b));
    b.type = V4L2_BUF_TYPE_VIDEO_CAPTURE;
    b.memory = V4L2_MEMORY_MMAP;
    if (xioctl(sess->fd, VIDIOC_DQBUF, &b) < 0) {
        throwTypeError(globalObject, scope,
            makeString("captureNext: VIDIOC_DQBUF: "_s,
                String::fromUTF8(::strerror(errno))));
        return {};
    }
    if (b.index >= sess->buffers.size()) {
        // Re-queue defensively; should not happen.
        xioctl(sess->fd, VIDIOC_QBUF, &b);
        throwTypeError(globalObject, scope, "captureNext: kernel returned out-of-range buffer index"_s);
        return {};
    }

    // Copy out — frees the kernel buffer immediately so we can re-queue.
    // For 4K @ 30fps this is ~25 MB/s memcpy, well below memory bandwidth.
    size_t bytesUsed = b.bytesused > 0 ? static_cast<size_t>(b.bytesused) : sess->buffers[b.index].length;
    auto* zigGlobal = dynamicDowncast<Zig::GlobalObject>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    auto* u8 = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, bytesUsed);
    RETURN_IF_EXCEPTION(scope, {});
    if (bytesUsed > 0) {
        std::memcpy(u8->vector(), sess->buffers[b.index].ptr, bytesUsed);
    }

    uint32_t sequence = b.sequence;
    // V4L2 timestamps come from the kernel; default flag is monotonic clock,
    // but some drivers set V4L2_BUF_FLAG_TIMESTAMP_COPY. Either way it's
    // a struct timeval — convert to ms since some monotonic origin.
    double timestampMs = static_cast<double>(b.timestamp.tv_sec) * 1000.0
        + static_cast<double>(b.timestamp.tv_usec) / 1000.0;

    // Re-queue the buffer immediately; the next captureNext will block on
    // the next frame the kernel fills.
    if (xioctl(sess->fd, VIDIOC_QBUF, &b) < 0) {
        throwTypeError(globalObject, scope,
            makeString("captureNext: re-queue VIDIOC_QBUF: "_s,
                String::fromUTF8(::strerror(errno))));
        return {};
    }

    JSObject* out = constructEmptyObject(globalObject, globalObject->objectPrototype());
    out->putDirect(vm, Identifier::fromString(vm, "data"_s), u8);
    out->putDirect(vm, Identifier::fromString(vm, "width"_s), jsNumber(sess->width));
    out->putDirect(vm, Identifier::fromString(vm, "height"_s), jsNumber(sess->height));
    out->putDirect(vm, Identifier::fromString(vm, "format"_s),
        jsString(vm, String::fromUTF8(stringFromFourcc(sess->fourcc) ?: "unknown")));
    out->putDirect(vm, Identifier::fromString(vm, "timestampMs"_s), jsNumber(timestampMs));
    out->putDirect(vm, Identifier::fromString(vm, "sequence"_s), jsNumber(sequence));
    return JSValue::encode(out);
#endif
}

// ─── factory ───────────────────────────────────────────────────────────────
JSC::JSObject* createParabunCamera(JSC::JSGlobalObject* globalObject)
{
    auto& vm = JSC::getVM(globalObject);
    JSC::JSObject* object = JSC::constructEmptyObject(vm, globalObject->nullPrototypeObjectStructure());
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "enumerateDevices"_s), 0,
        functionEnumerateDevices, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "queryFormats"_s), 1,
        functionQueryFormats, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "openDevice"_s), 5,
        functionOpenDevice, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "closeDevice"_s), 1,
        functionCloseDevice, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "captureNext"_s), 2,
        functionCaptureNext, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    return object;
}

} // namespace Bun
