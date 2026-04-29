// Parabun: native GPIO bindings for `bun:gpio` (LYK-768 / PLAN-bun-hal).
//
// Linux GPIO character device, uAPI v2 (/dev/gpiochipN). Works unchanged
// across RPi 4, RPi 5 (pinctrl-rp1), Jetson, and any other Linux SBC.
//
// JS surface (called from src/js/bun/gpio.ts):
//   listChips()                    → Array<{ path, label, lines }>
//   chipInfo(path)                 → { path, label, lines } or throws
//   openChip(path)                 → BigInt fd
//   closeChip(fd)                  → void
//   requestLine(chipFd, offset, mode, pull, edge, debounceMs, initial)
//                                  → BigInt lineFd
//   readLine(lineFd)               → 0 | 1
//   writeLine(lineFd, value)       → void
//   readEvent(lineFd)              → { kind: "rising"|"falling",
//                                       timestampNs: BigInt, value: 0|1 }
//                                  // blocks on a read() of the line fd.
//   closeLine(lineFd)              → void
//
// On non-Linux every entry point throws "bun:gpio not yet implemented on
// this platform". macOS / Windows backends are out of scope.

#include "root.h"
#include "parabun_gpio.h"

#include <JavaScriptCore/CallData.h>
#include <JavaScriptCore/JSArray.h>
#include <JavaScriptCore/JSBigInt.h>
#include <JavaScriptCore/JSCInlines.h>
#include <JavaScriptCore/JSObject.h>
#include <JavaScriptCore/JSTypedArrays.h>
#include <JavaScriptCore/ObjectConstructor.h>

#include "ZigGlobalObject.h"

#include <cstdint>
#include <cstring>
#include <string>

#if defined(__linux__)
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <linux/gpio.h>
#include <sys/ioctl.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

namespace Bun {

using namespace JSC;

namespace {

#if defined(__linux__)

int xioctl(int fd, unsigned long req, void* arg)
{
    int r;
    do {
        r = ::ioctl(fd, req, arg);
    } while (r == -1 && errno == EINTR);
    return r;
}

// Throw a TypeError including errno's strerror text. Used for any
// Linux-syscall failure path so JS sees a meaningful message.
void throwErrno(JSGlobalObject* globalObject, ThrowScope& scope, const char* prefix)
{
    throwTypeError(globalObject, scope,
        makeString(String::fromUTF8(prefix), ": "_s,
            String::fromUTF8(::strerror(errno))));
}

#endif // __linux__

} // anonymous namespace

// ─── listChips ─────────────────────────────────────────────────────────────
// Walk /dev for entries matching gpiochip[0-9]+. For each, open + GPIO_GET_CHIPINFO_IOCTL.
JSC_DEFINE_HOST_FUNCTION(functionListChips,
    (JSGlobalObject * globalObject, CallFrame*))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSArray* arr = constructEmptyArray(globalObject, nullptr);
    RETURN_IF_EXCEPTION(scope, {});

#if defined(__linux__)
    DIR* dir = ::opendir("/dev");
    if (!dir) return JSValue::encode(arr);
    unsigned int idx = 0;
    while (struct dirent* ent = ::readdir(dir)) {
        const char* n = ent->d_name;
        // Match gpiochipN where N is one or more digits.
        if (std::strncmp(n, "gpiochip", 8) != 0) continue;
        const char* tail = n + 8;
        if (*tail == '\0') continue;
        bool allDigits = true;
        for (const char* p = tail; *p; ++p) {
            if (*p < '0' || *p > '9') { allDigits = false; break; }
        }
        if (!allDigits) continue;
        std::string path = std::string("/dev/") + n;
        int fd = ::open(path.c_str(), O_RDONLY | O_CLOEXEC);
        if (fd < 0) continue;
        struct gpiochip_info ci;
        std::memset(&ci, 0, sizeof(ci));
        if (xioctl(fd, GPIO_GET_CHIPINFO_IOCTL, &ci) < 0) {
            ::close(fd);
            continue;
        }
        ::close(fd);

        JSObject* o = constructEmptyObject(globalObject, globalObject->objectPrototype());
        o->putDirect(vm, Identifier::fromString(vm, "path"_s), jsString(vm, String::fromUTF8(path.c_str())));
        o->putDirect(vm, Identifier::fromString(vm, "label"_s), jsString(vm, String::fromUTF8(ci.label)));
        o->putDirect(vm, Identifier::fromString(vm, "lines"_s), jsNumber(static_cast<double>(ci.lines)));
        arr->putDirectIndex(globalObject, idx++, o);
    }
    ::closedir(dir);
#endif
    return JSValue::encode(arr);
}

// ─── openChip ──────────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionOpenChip,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "bun:gpio not yet implemented on this platform"_s);
    return {};
#else
    if (callFrame->argumentCount() < 1) {
        throwTypeError(globalObject, scope, "openChip(path) requires 1 argument"_s);
        return {};
    }
    String pathStr = callFrame->argument(0).toWTFString(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    auto utf8 = pathStr.utf8();
    int fd = ::open(utf8.data(), O_RDWR | O_CLOEXEC);
    if (fd < 0) {
        throwErrno(globalObject, scope, "openChip");
        return {};
    }
    // Verify it's actually a gpiochip with one chipinfo round-trip.
    struct gpiochip_info ci;
    std::memset(&ci, 0, sizeof(ci));
    if (xioctl(fd, GPIO_GET_CHIPINFO_IOCTL, &ci) < 0) {
        ::close(fd);
        throwErrno(globalObject, scope, "openChip: GPIO_GET_CHIPINFO_IOCTL");
        return {};
    }
    return JSValue::encode(JSBigInt::createFrom(globalObject, static_cast<int64_t>(fd)));
#endif
}

// ─── chipInfo (path string variant) ────────────────────────────────────────
// Lets JS query a chip without holding it open. Used by the docs example
// and by chip enumeration when the user has only a path.
JSC_DEFINE_HOST_FUNCTION(functionChipInfo,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "bun:gpio not yet implemented on this platform"_s);
    return {};
#else
    if (callFrame->argumentCount() < 1) {
        throwTypeError(globalObject, scope, "chipInfo(path) requires 1 argument"_s);
        return {};
    }
    String pathStr = callFrame->argument(0).toWTFString(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    auto utf8 = pathStr.utf8();
    int fd = ::open(utf8.data(), O_RDONLY | O_CLOEXEC);
    if (fd < 0) {
        throwErrno(globalObject, scope, "chipInfo");
        return {};
    }
    struct gpiochip_info ci;
    std::memset(&ci, 0, sizeof(ci));
    if (xioctl(fd, GPIO_GET_CHIPINFO_IOCTL, &ci) < 0) {
        ::close(fd);
        throwErrno(globalObject, scope, "chipInfo: GPIO_GET_CHIPINFO_IOCTL");
        return {};
    }
    ::close(fd);

    JSObject* o = constructEmptyObject(globalObject, globalObject->objectPrototype());
    o->putDirect(vm, Identifier::fromString(vm, "path"_s), jsString(vm, pathStr));
    o->putDirect(vm, Identifier::fromString(vm, "label"_s), jsString(vm, String::fromUTF8(ci.label)));
    o->putDirect(vm, Identifier::fromString(vm, "lines"_s), jsNumber(static_cast<double>(ci.lines)));
    return JSValue::encode(o);
#endif
}

// ─── requestLine ───────────────────────────────────────────────────────────
// Acquire a single GPIO line via GPIO_V2_GET_LINE_IOCTL. Returns the line fd
// as a BigInt; the JS side wraps that in a CleanupRegistry.
//
// Args (positional, all required):
//   chipFd      BigInt — the chip handle from openChip
//   offset      number — line index on the chip
//   mode        number — 0 = in, 1 = out
//   pull        number — 0 = none, 1 = up, 2 = down
//   edge        number — 0 = none, 1 = rising, 2 = falling, 3 = both
//   debounceMs  number — 0 disables; only meaningful for input lines
//   initial     number — initial output value (0 / 1); ignored for inputs
JSC_DEFINE_HOST_FUNCTION(functionRequestLine,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "bun:gpio not yet implemented on this platform"_s);
    return {};
#else
    if (callFrame->argumentCount() < 7) {
        throwTypeError(globalObject, scope,
            "requestLine(chipFd, offset, mode, pull, edge, debounceMs, initial) requires 7 arguments"_s);
        return {};
    }
    JSValue chipFdVal = callFrame->argument(0);
    if (!chipFdVal.isBigInt()) {
        throwTypeError(globalObject, scope, "requestLine: chipFd must be a BigInt"_s);
        return {};
    }
    int chipFd = static_cast<int>(JSBigInt::toBigInt64(jsCast<JSBigInt*>(chipFdVal.asCell())));
    if (chipFd < 0) {
        throwTypeError(globalObject, scope, "requestLine: invalid chipFd"_s);
        return {};
    }
    unsigned int offset = callFrame->argument(1).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    unsigned int mode = callFrame->argument(2).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    unsigned int pull = callFrame->argument(3).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    unsigned int edge = callFrame->argument(4).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    uint32_t debounceMs = callFrame->argument(5).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    unsigned int initial = callFrame->argument(6).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});

    struct gpio_v2_line_request req;
    std::memset(&req, 0, sizeof(req));
    req.num_lines = 1;
    req.offsets[0] = offset;
    std::strncpy(req.consumer, "parabun", sizeof(req.consumer) - 1);

    uint64_t flags = 0;
    if (mode == 1) {
        flags |= GPIO_V2_LINE_FLAG_OUTPUT;
    } else {
        flags |= GPIO_V2_LINE_FLAG_INPUT;
    }
    if (pull == 1) flags |= GPIO_V2_LINE_FLAG_BIAS_PULL_UP;
    else if (pull == 2) flags |= GPIO_V2_LINE_FLAG_BIAS_PULL_DOWN;
    else if (pull == 0 && mode == 0) flags |= GPIO_V2_LINE_FLAG_BIAS_DISABLED;

    if (edge == 1) flags |= GPIO_V2_LINE_FLAG_EDGE_RISING;
    else if (edge == 2) flags |= GPIO_V2_LINE_FLAG_EDGE_FALLING;
    else if (edge == 3) flags |= (GPIO_V2_LINE_FLAG_EDGE_RISING | GPIO_V2_LINE_FLAG_EDGE_FALLING);

    req.config.flags = flags;
    // Initial output value goes into a per-line attribute when output.
    if (mode == 1) {
        req.config.attrs[0].mask = 1ULL;
        req.config.attrs[0].attr.id = GPIO_V2_LINE_ATTR_ID_OUTPUT_VALUES;
        req.config.attrs[0].attr.values = (initial != 0) ? 1ULL : 0ULL;
        req.config.num_attrs = 1;
    }
    // Debounce attribute (input only). num_attrs may be 1 already for output;
    // here it's distinct slot 1.
    if (mode == 0 && debounceMs > 0) {
        unsigned int slot = req.config.num_attrs;
        if (slot >= GPIO_V2_LINE_NUM_ATTRS_MAX) slot = GPIO_V2_LINE_NUM_ATTRS_MAX - 1;
        req.config.attrs[slot].mask = 1ULL;
        req.config.attrs[slot].attr.id = GPIO_V2_LINE_ATTR_ID_DEBOUNCE;
        req.config.attrs[slot].attr.debounce_period_us = debounceMs * 1000;
        req.config.num_attrs = slot + 1;
    }

    if (xioctl(chipFd, GPIO_V2_GET_LINE_IOCTL, &req) < 0) {
        throwErrno(globalObject, scope, "requestLine: GPIO_V2_GET_LINE_IOCTL");
        return {};
    }
    return JSValue::encode(JSBigInt::createFrom(globalObject, static_cast<int64_t>(req.fd)));
#endif
}

// ─── readLine ──────────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionReadLine,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "bun:gpio not yet implemented on this platform"_s);
    return {};
#else
    JSValue lineFdVal = callFrame->argument(0);
    if (!lineFdVal.isBigInt()) {
        throwTypeError(globalObject, scope, "readLine: lineFd must be a BigInt"_s);
        return {};
    }
    int lineFd = static_cast<int>(JSBigInt::toBigInt64(jsCast<JSBigInt*>(lineFdVal.asCell())));

    struct gpio_v2_line_values vals;
    std::memset(&vals, 0, sizeof(vals));
    vals.mask = 1ULL;
    if (xioctl(lineFd, GPIO_V2_LINE_GET_VALUES_IOCTL, &vals) < 0) {
        throwErrno(globalObject, scope, "readLine: GPIO_V2_LINE_GET_VALUES_IOCTL");
        return {};
    }
    return JSValue::encode(jsNumber((vals.bits & 1ULL) ? 1 : 0));
#endif
}

// ─── writeLine ─────────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionWriteLine,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "bun:gpio not yet implemented on this platform"_s);
    return {};
#else
    JSValue lineFdVal = callFrame->argument(0);
    if (!lineFdVal.isBigInt()) {
        throwTypeError(globalObject, scope, "writeLine: lineFd must be a BigInt"_s);
        return {};
    }
    int lineFd = static_cast<int>(JSBigInt::toBigInt64(jsCast<JSBigInt*>(lineFdVal.asCell())));
    unsigned int v = callFrame->argument(1).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});

    struct gpio_v2_line_values vals;
    std::memset(&vals, 0, sizeof(vals));
    vals.mask = 1ULL;
    vals.bits = v ? 1ULL : 0ULL;
    if (xioctl(lineFd, GPIO_V2_LINE_SET_VALUES_IOCTL, &vals) < 0) {
        throwErrno(globalObject, scope, "writeLine: GPIO_V2_LINE_SET_VALUES_IOCTL");
        return {};
    }
    return JSValue::encode(jsUndefined());
#endif
}

// ─── readEvent ─────────────────────────────────────────────────────────────
// Blocking read() on the line fd for one gpio_v2_line_event. Returns a
// {kind, timestampNs, value} object. JS side wraps in an async iterator
// so the read() runs without blocking the JS event loop's micro-tasks
// (Bun's I/O thread handles the read; result delivered to JS at the
// usual await point).
JSC_DEFINE_HOST_FUNCTION(functionReadEvent,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "bun:gpio not yet implemented on this platform"_s);
    return {};
#else
    JSValue lineFdVal = callFrame->argument(0);
    if (!lineFdVal.isBigInt()) {
        throwTypeError(globalObject, scope, "readEvent: lineFd must be a BigInt"_s);
        return {};
    }
    int lineFd = static_cast<int>(JSBigInt::toBigInt64(jsCast<JSBigInt*>(lineFdVal.asCell())));

    struct gpio_v2_line_event ev;
    ssize_t n;
    do {
        n = ::read(lineFd, &ev, sizeof(ev));
    } while (n == -1 && errno == EINTR);
    if (n != sizeof(ev)) {
        if (n < 0) {
            throwErrno(globalObject, scope, "readEvent: read");
        } else {
            throwTypeError(globalObject, scope,
                makeString("readEvent: short read ("_s, n, " bytes)"_s));
        }
        return {};
    }

    JSObject* o = constructEmptyObject(globalObject, globalObject->objectPrototype());
    const char* kind = (ev.id == GPIO_V2_LINE_EVENT_RISING_EDGE) ? "rising" : "falling";
    o->putDirect(vm, Identifier::fromString(vm, "kind"_s), jsString(vm, String::fromUTF8(kind)));
    o->putDirect(vm, Identifier::fromString(vm, "timestampNs"_s),
        JSBigInt::createFrom(globalObject, static_cast<int64_t>(ev.timestamp_ns)));
    o->putDirect(vm, Identifier::fromString(vm, "value"_s),
        jsNumber((ev.id == GPIO_V2_LINE_EVENT_RISING_EDGE) ? 1 : 0));
    return JSValue::encode(o);
#endif
}

// ─── requestLines ──────────────────────────────────────────────────────────
// Multi-line bulk request — same shape as requestLine but with an array
// of offsets. Returns a single line fd that controls all `n` lines
// atomically. Read/write at the kernel level use a 64-bit bitmask, so
// `n` is capped at GPIO_V2_LINES_MAX (64).
//
// Args:
//   chipFd      BigInt
//   offsetsTA   Uint32Array — [n] line offsets on the chip
//   mode        number  — 0 = in, 1 = out
//   pull        number
//   edge        number  — outputs ignore this; inputs apply to every line
//   debounceMs  number  — inputs only
//   initialMask BigInt  — bit i = initial value of line i (outputs only)
JSC_DEFINE_HOST_FUNCTION(functionRequestLines,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "bun:gpio not yet implemented on this platform"_s);
    return {};
#else
    if (callFrame->argumentCount() < 7) {
        throwTypeError(globalObject, scope,
            "requestLines(chipFd, offsetsU32, mode, pull, edge, debounceMs, initialMask) requires 7 arguments"_s);
        return {};
    }
    JSValue chipFdVal = callFrame->argument(0);
    if (!chipFdVal.isBigInt()) {
        throwTypeError(globalObject, scope, "requestLines: chipFd must be a BigInt"_s);
        return {};
    }
    int chipFd = static_cast<int>(JSBigInt::toBigInt64(jsCast<JSBigInt*>(chipFdVal.asCell())));
    if (chipFd < 0) {
        throwTypeError(globalObject, scope, "requestLines: invalid chipFd"_s);
        return {};
    }
    JSC::JSUint32Array* offsetsArr = JSC::jsDynamicCast<JSC::JSUint32Array*>(callFrame->argument(1));
    if (!offsetsArr) {
        throwTypeError(globalObject, scope, "requestLines: offsets must be a Uint32Array"_s);
        return {};
    }
    size_t n = offsetsArr->length();
    if (n == 0 || n > GPIO_V2_LINES_MAX) {
        throwTypeError(globalObject, scope,
            makeString("requestLines: n must be 1.."_s, static_cast<unsigned>(GPIO_V2_LINES_MAX)));
        return {};
    }
    unsigned int mode = callFrame->argument(2).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    unsigned int pull = callFrame->argument(3).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    unsigned int edge = callFrame->argument(4).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    uint32_t debounceMs = callFrame->argument(5).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    JSValue initialMaskVal = callFrame->argument(6);
    if (!initialMaskVal.isBigInt()) {
        throwTypeError(globalObject, scope, "requestLines: initialMask must be a BigInt"_s);
        return {};
    }
    uint64_t initialMask = static_cast<uint64_t>(
        JSBigInt::toBigInt64(jsCast<JSBigInt*>(initialMaskVal.asCell())));

    struct gpio_v2_line_request req;
    std::memset(&req, 0, sizeof(req));
    req.num_lines = static_cast<__u32>(n);
    const uint32_t* offsetsData = static_cast<const uint32_t*>(offsetsArr->vector());
    for (size_t i = 0; i < n; i++) req.offsets[i] = offsetsData[i];
    std::strncpy(req.consumer, "parabun", sizeof(req.consumer) - 1);

    uint64_t flags = 0;
    if (mode == 1) flags |= GPIO_V2_LINE_FLAG_OUTPUT;
    else flags |= GPIO_V2_LINE_FLAG_INPUT;
    if (pull == 1) flags |= GPIO_V2_LINE_FLAG_BIAS_PULL_UP;
    else if (pull == 2) flags |= GPIO_V2_LINE_FLAG_BIAS_PULL_DOWN;
    else if (pull == 0 && mode == 0) flags |= GPIO_V2_LINE_FLAG_BIAS_DISABLED;
    if (edge == 1) flags |= GPIO_V2_LINE_FLAG_EDGE_RISING;
    else if (edge == 2) flags |= GPIO_V2_LINE_FLAG_EDGE_FALLING;
    else if (edge == 3) flags |= (GPIO_V2_LINE_FLAG_EDGE_RISING | GPIO_V2_LINE_FLAG_EDGE_FALLING);
    req.config.flags = flags;

    // The "all lines" mask is the low n bits set.
    const uint64_t allMask = (n == 64) ? ~0ULL : ((1ULL << n) - 1ULL);
    if (mode == 1) {
        req.config.attrs[0].mask = allMask;
        req.config.attrs[0].attr.id = GPIO_V2_LINE_ATTR_ID_OUTPUT_VALUES;
        req.config.attrs[0].attr.values = initialMask & allMask;
        req.config.num_attrs = 1;
    }
    if (mode == 0 && debounceMs > 0) {
        unsigned int slot = req.config.num_attrs;
        if (slot >= GPIO_V2_LINE_NUM_ATTRS_MAX) slot = GPIO_V2_LINE_NUM_ATTRS_MAX - 1;
        req.config.attrs[slot].mask = allMask;
        req.config.attrs[slot].attr.id = GPIO_V2_LINE_ATTR_ID_DEBOUNCE;
        req.config.attrs[slot].attr.debounce_period_us = debounceMs * 1000;
        req.config.num_attrs = slot + 1;
    }

    if (xioctl(chipFd, GPIO_V2_GET_LINE_IOCTL, &req) < 0) {
        throwErrno(globalObject, scope, "requestLines: GPIO_V2_GET_LINE_IOCTL");
        return {};
    }
    return JSValue::encode(JSBigInt::createFrom(globalObject, static_cast<int64_t>(req.fd)));
#endif
}

// ─── readLines / writeLines ────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionReadLines,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "bun:gpio not yet implemented on this platform"_s);
    return {};
#else
    JSValue lineFdVal = callFrame->argument(0);
    if (!lineFdVal.isBigInt()) {
        throwTypeError(globalObject, scope, "readLines: lineFd must be a BigInt"_s);
        return {};
    }
    int lineFd = static_cast<int>(JSBigInt::toBigInt64(jsCast<JSBigInt*>(lineFdVal.asCell())));
    uint32_t n = callFrame->argument(1).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    if (n == 0 || n > GPIO_V2_LINES_MAX) {
        throwTypeError(globalObject, scope, "readLines: n must be 1..64"_s);
        return {};
    }

    struct gpio_v2_line_values vals;
    std::memset(&vals, 0, sizeof(vals));
    vals.mask = (n == 64) ? ~0ULL : ((1ULL << n) - 1ULL);
    if (xioctl(lineFd, GPIO_V2_LINE_GET_VALUES_IOCTL, &vals) < 0) {
        throwErrno(globalObject, scope, "readLines: GPIO_V2_LINE_GET_VALUES_IOCTL");
        return {};
    }
    return JSValue::encode(JSBigInt::createFrom(globalObject, static_cast<int64_t>(vals.bits & vals.mask)));
#endif
}

JSC_DEFINE_HOST_FUNCTION(functionWriteLines,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "bun:gpio not yet implemented on this platform"_s);
    return {};
#else
    if (callFrame->argumentCount() < 3) {
        throwTypeError(globalObject, scope, "writeLines(lineFd, valuesBigInt, maskBigInt) requires 3 arguments"_s);
        return {};
    }
    JSValue lineFdVal = callFrame->argument(0);
    if (!lineFdVal.isBigInt()) {
        throwTypeError(globalObject, scope, "writeLines: lineFd must be a BigInt"_s);
        return {};
    }
    int lineFd = static_cast<int>(JSBigInt::toBigInt64(jsCast<JSBigInt*>(lineFdVal.asCell())));
    JSValue valuesVal = callFrame->argument(1);
    JSValue maskVal = callFrame->argument(2);
    if (!valuesVal.isBigInt() || !maskVal.isBigInt()) {
        throwTypeError(globalObject, scope, "writeLines: values and mask must be BigInts"_s);
        return {};
    }
    uint64_t values = static_cast<uint64_t>(JSBigInt::toBigInt64(jsCast<JSBigInt*>(valuesVal.asCell())));
    uint64_t mask = static_cast<uint64_t>(JSBigInt::toBigInt64(jsCast<JSBigInt*>(maskVal.asCell())));

    struct gpio_v2_line_values vals;
    std::memset(&vals, 0, sizeof(vals));
    vals.mask = mask;
    vals.bits = values & mask;
    if (xioctl(lineFd, GPIO_V2_LINE_SET_VALUES_IOCTL, &vals) < 0) {
        throwErrno(globalObject, scope, "writeLines: GPIO_V2_LINE_SET_VALUES_IOCTL");
        return {};
    }
    return JSValue::encode(jsUndefined());
#endif
}

// ─── closeChip / closeLine ─────────────────────────────────────────────────
// Both just call ::close on the fd. Separate names so the JS layer can
// distinguish chip vs line lifecycle.
static JSValue closeFdShared(JSGlobalObject* globalObject, ThrowScope& scope, JSValue v)
{
#if !defined(__linux__)
    throwTypeError(globalObject, scope, "bun:gpio not yet implemented on this platform"_s);
    return {};
#else
    (void)scope;
    if (!v.isBigInt()) return jsUndefined();
    int fd = static_cast<int>(JSBigInt::toBigInt64(jsCast<JSBigInt*>(v.asCell())));
    if (fd >= 0) ::close(fd);
    return jsUndefined();
#endif
}

JSC_DEFINE_HOST_FUNCTION(functionCloseChip,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);
    return JSValue::encode(closeFdShared(globalObject, scope, callFrame->argument(0)));
}

JSC_DEFINE_HOST_FUNCTION(functionCloseLine,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);
    return JSValue::encode(closeFdShared(globalObject, scope, callFrame->argument(0)));
}

// ─── factory ───────────────────────────────────────────────────────────────
JSC::JSObject* createParabunGpio(JSC::JSGlobalObject* globalObject)
{
    auto& vm = JSC::getVM(globalObject);
    JSC::JSObject* object = JSC::constructEmptyObject(vm, globalObject->nullPrototypeObjectStructure());

    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "listChips"_s), 0,
        functionListChips, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "chipInfo"_s), 1,
        functionChipInfo, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "openChip"_s), 1,
        functionOpenChip, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "closeChip"_s), 1,
        functionCloseChip, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "requestLine"_s), 7,
        functionRequestLine, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "closeLine"_s), 1,
        functionCloseLine, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "readLine"_s), 1,
        functionReadLine, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "writeLine"_s), 2,
        functionWriteLine, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "readEvent"_s), 1,
        functionReadEvent, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "requestLines"_s), 7,
        functionRequestLines, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "readLines"_s), 2,
        functionReadLines, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "writeLines"_s), 3,
        functionWriteLines, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    return object;
}

} // namespace Bun
