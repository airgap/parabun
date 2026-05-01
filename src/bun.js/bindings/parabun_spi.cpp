// Parabun: native SPI bindings for `parabun:spi` (LYK-770 / PLAN-bun-hal).
//
// Linux spidev character device wrapper. Full-duplex transfers + multi-
// segment transactions with CS held across segments.
//
// JS surface (called from src/js/bun/spi.ts):
//   listDevices()                              → Array<{path, bus, cs}>
//   openDevice(path, mode, bitsPerWord, speed) → BigInt fd
//   closeDevice(fd)                            → void
//   transfer(fd, tx, speed, delayUs)           → Uint8Array (rx, same length)
//   transactSegments(fd, segments, defaultSpeed, defaultDelayUs)
//                                              → Array<Uint8Array | undefined>
//        // segments: [{tx?: Uint8Array, rx?: number, speed?, delayUs?,
//        //             bitsPerWord?, csChange?}, ...]
//
// On non-Linux every entry point throws "parabun:spi not yet implemented on
// this platform".

#include "root.h"
#include "parabun_spi.h"

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
#include <vector>

#if defined(__linux__)
#include <dirent.h>
#include <errno.h>
#include <fcntl.h>
#include <linux/spi/spidev.h>
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

void throwErrno(JSGlobalObject* globalObject, ThrowScope& scope, const char* prefix)
{
    throwTypeError(globalObject, scope,
        makeString(String::fromUTF8(prefix), ": "_s,
            String::fromUTF8(::strerror(errno))));
}

// Parse a spidev<bus>.<cs> filename. Returns true on match, populating
// busOut + csOut.
bool parseSpidevName(const char* name, unsigned& busOut, unsigned& csOut)
{
    if (std::strncmp(name, "spidev", 6) != 0) return false;
    const char* p = name + 6;
    if (*p == '\0' || *p < '0' || *p > '9') return false;
    unsigned bus = 0;
    while (*p >= '0' && *p <= '9') {
        bus = bus * 10 + static_cast<unsigned>(*p - '0');
        ++p;
    }
    if (*p != '.') return false;
    ++p;
    if (*p == '\0' || *p < '0' || *p > '9') return false;
    unsigned cs = 0;
    while (*p >= '0' && *p <= '9') {
        cs = cs * 10 + static_cast<unsigned>(*p - '0');
        ++p;
    }
    if (*p != '\0') return false;
    busOut = bus;
    csOut = cs;
    return true;
}

#endif // __linux__

} // anonymous namespace

// ─── listDevices ───────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionSpiListDevices,
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
        unsigned bus, cs;
        if (!parseSpidevName(ent->d_name, bus, cs)) continue;
        std::string path = std::string("/dev/") + ent->d_name;

        JSObject* o = constructEmptyObject(globalObject, globalObject->objectPrototype());
        o->putDirect(vm, Identifier::fromString(vm, "path"_s), jsString(vm, String::fromUTF8(path.c_str())));
        o->putDirect(vm, Identifier::fromString(vm, "bus"_s), jsNumber(static_cast<double>(bus)));
        o->putDirect(vm, Identifier::fromString(vm, "cs"_s), jsNumber(static_cast<double>(cs)));
        arr->putDirectIndex(globalObject, idx++, o);
    }
    ::closedir(dir);
#endif
    return JSValue::encode(arr);
}

// ─── openDevice ────────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionSpiOpenDevice,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:spi not yet implemented on this platform"_s);
    return {};
#else
    if (callFrame->argumentCount() < 4) {
        throwTypeError(globalObject, scope,
            "openDevice(path, mode, bitsPerWord, speedHz) requires 4 arguments"_s);
        return {};
    }
    String pathStr = callFrame->argument(0).toWTFString(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    uint32_t mode = callFrame->argument(1).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    uint32_t bitsPerWord = callFrame->argument(2).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    uint32_t speedHz = callFrame->argument(3).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});

    auto utf8 = pathStr.utf8();
    int fd = ::open(utf8.data(), O_RDWR | O_CLOEXEC);
    if (fd < 0) {
        throwErrno(globalObject, scope, "openDevice");
        return {};
    }
    uint8_t modeByte = static_cast<uint8_t>(mode & 0x03); // mode 0..3
    if (xioctl(fd, SPI_IOC_WR_MODE, &modeByte) < 0) {
        ::close(fd);
        throwErrno(globalObject, scope, "openDevice: SPI_IOC_WR_MODE");
        return {};
    }
    uint8_t bpw = static_cast<uint8_t>(bitsPerWord ? bitsPerWord : 8);
    if (xioctl(fd, SPI_IOC_WR_BITS_PER_WORD, &bpw) < 0) {
        ::close(fd);
        throwErrno(globalObject, scope, "openDevice: SPI_IOC_WR_BITS_PER_WORD");
        return {};
    }
    uint32_t speed = speedHz ? speedHz : 1000000;
    if (xioctl(fd, SPI_IOC_WR_MAX_SPEED_HZ, &speed) < 0) {
        ::close(fd);
        throwErrno(globalObject, scope, "openDevice: SPI_IOC_WR_MAX_SPEED_HZ");
        return {};
    }
    return JSValue::encode(JSBigInt::createFrom(globalObject, static_cast<int64_t>(fd)));
#endif
}

// ─── closeDevice ───────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionSpiCloseDevice,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    JSValue v = callFrame->argument(0);
    if (!v.isBigInt()) return JSValue::encode(jsUndefined());
    int fd = static_cast<int>(JSBigInt::toBigInt64(jsCast<JSBigInt*>(v.asCell())));
#if defined(__linux__)
    if (fd >= 0) ::close(fd);
#endif
    (void)globalObject;
    return JSValue::encode(jsUndefined());
}

// ─── transfer ──────────────────────────────────────────────────────────────
// Single full-duplex transfer. tx (Uint8Array) is shifted out; the same
// number of bytes is shifted in and returned. CS is asserted for the
// duration of the transfer.
JSC_DEFINE_HOST_FUNCTION(functionSpiTransfer,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:spi not yet implemented on this platform"_s);
    return {};
#else
    if (callFrame->argumentCount() < 2) {
        throwTypeError(globalObject, scope, "transfer(fd, tx[, speedHz[, delayUs]]) requires 2+ arguments"_s);
        return {};
    }
    JSValue fdVal = callFrame->argument(0);
    if (!fdVal.isBigInt()) {
        throwTypeError(globalObject, scope, "transfer: fd must be a BigInt"_s);
        return {};
    }
    int fd = static_cast<int>(JSBigInt::toBigInt64(jsCast<JSBigInt*>(fdVal.asCell())));
    JSC::JSUint8Array* txArr = JSC::jsDynamicCast<JSC::JSUint8Array*>(callFrame->argument(1));
    if (!txArr) {
        throwTypeError(globalObject, scope, "transfer: tx must be a Uint8Array"_s);
        return {};
    }
    size_t length = txArr->byteLength();
    if (length == 0 || length > (1u << 20)) {
        throwTypeError(globalObject, scope, "transfer: length must be 1..1048576"_s);
        return {};
    }
    uint32_t speedHz = 0;
    if (callFrame->argumentCount() >= 3 && !callFrame->argument(2).isUndefined()) {
        speedHz = callFrame->argument(2).toUInt32(globalObject);
        RETURN_IF_EXCEPTION(scope, {});
    }
    uint32_t delayUs = 0;
    if (callFrame->argumentCount() >= 4 && !callFrame->argument(3).isUndefined()) {
        delayUs = callFrame->argument(3).toUInt32(globalObject);
        RETURN_IF_EXCEPTION(scope, {});
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    auto* rx = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, length);
    RETURN_IF_EXCEPTION(scope, {});

    struct spi_ioc_transfer xfer;
    std::memset(&xfer, 0, sizeof(xfer));
    xfer.tx_buf = reinterpret_cast<__u64>(txArr->vector());
    xfer.rx_buf = reinterpret_cast<__u64>(rx->vector());
    xfer.len = static_cast<__u32>(length);
    xfer.speed_hz = speedHz;
    xfer.delay_usecs = static_cast<__u16>(delayUs > 0xffff ? 0xffff : delayUs);
    xfer.bits_per_word = 0; // 0 = use device default
    xfer.cs_change = 0;
    if (xioctl(fd, SPI_IOC_MESSAGE(1), &xfer) < 0) {
        throwErrno(globalObject, scope, "transfer: SPI_IOC_MESSAGE");
        return {};
    }
    return JSValue::encode(rx);
#endif
}

// ─── transactSegments ──────────────────────────────────────────────────────
// Multi-segment transaction with CS held across all segments (per-segment
// csChange flag flips that). Each segment is one of:
//   { tx: Uint8Array, rx?: number }     — full duplex if rx == tx.length
//                                       — half-duplex tx if rx omitted
//   { rx: number }                      — half-duplex read
//   plus optional speedHz, delayUs, bitsPerWord, csChange
// Returns Array<Uint8Array | undefined> with one slot per segment (undefined
// for tx-only).
JSC_DEFINE_HOST_FUNCTION(functionSpiTransactSegments,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:spi not yet implemented on this platform"_s);
    return {};
#else
    if (callFrame->argumentCount() < 2) {
        throwTypeError(globalObject, scope, "transactSegments(fd, segments) requires 2 arguments"_s);
        return {};
    }
    JSValue fdVal = callFrame->argument(0);
    if (!fdVal.isBigInt()) {
        throwTypeError(globalObject, scope, "transactSegments: fd must be a BigInt"_s);
        return {};
    }
    int fd = static_cast<int>(JSBigInt::toBigInt64(jsCast<JSBigInt*>(fdVal.asCell())));
    JSArray* segments = JSC::jsDynamicCast<JSArray*>(callFrame->argument(1));
    if (!segments) {
        throwTypeError(globalObject, scope, "transactSegments: segments must be an array"_s);
        return {};
    }
    unsigned len = segments->length();
    if (len == 0 || len > 256) {
        throwTypeError(globalObject, scope, "transactSegments: segments length must be 1..256"_s);
        return {};
    }

    auto* zigGlobal = jsCast<Zig::GlobalObject*>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    std::vector<struct spi_ioc_transfer> xfers(len);
    std::vector<JSC::JSUint8Array*> rxSlots(len, nullptr);
    Identifier txId = Identifier::fromString(vm, "tx"_s);
    Identifier rxId = Identifier::fromString(vm, "rx"_s);
    Identifier speedId = Identifier::fromString(vm, "speedHz"_s);
    Identifier delayId = Identifier::fromString(vm, "delayUs"_s);
    Identifier bpwId = Identifier::fromString(vm, "bitsPerWord"_s);
    Identifier csId = Identifier::fromString(vm, "csChange"_s);

    for (unsigned i = 0; i < len; ++i) {
        JSValue segVal = segments->getIndex(globalObject, i);
        RETURN_IF_EXCEPTION(scope, {});
        JSObject* seg = JSC::jsDynamicCast<JSObject*>(segVal);
        if (!seg) {
            throwTypeError(globalObject, scope, "transactSegments: each segment must be an object"_s);
            return {};
        }
        JSValue txVal = seg->get(globalObject, txId);
        RETURN_IF_EXCEPTION(scope, {});
        JSValue rxVal = seg->get(globalObject, rxId);
        RETURN_IF_EXCEPTION(scope, {});

        std::memset(&xfers[i], 0, sizeof(struct spi_ioc_transfer));

        size_t length = 0;
        JSC::JSUint8Array* txArr = nullptr;
        if (!txVal.isUndefined() && !txVal.isNull()) {
            txArr = JSC::jsDynamicCast<JSC::JSUint8Array*>(txVal);
            if (!txArr) {
                throwTypeError(globalObject, scope, "transactSegments: tx must be a Uint8Array"_s);
                return {};
            }
            length = txArr->byteLength();
        }
        size_t rxLen = 0;
        bool rxRequested = false;
        if (!rxVal.isUndefined() && !rxVal.isNull()) {
            rxLen = rxVal.toUInt32(globalObject);
            RETURN_IF_EXCEPTION(scope, {});
            rxRequested = true;
        }
        // Full-duplex: tx + rx must match. Half-duplex: one or the other.
        if (rxRequested && txArr) {
            if (rxLen != length) {
                throwTypeError(globalObject, scope,
                    "transactSegments: full-duplex segments need rx == tx.length"_s);
                return {};
            }
        } else if (rxRequested) {
            length = rxLen;
        } else if (!txArr) {
            throwTypeError(globalObject, scope,
                "transactSegments: each segment needs tx and/or rx"_s);
            return {};
        }
        if (length == 0 || length > (1u << 20)) {
            throwTypeError(globalObject, scope,
                "transactSegments: segment length must be 1..1048576"_s);
            return {};
        }

        xfers[i].tx_buf = txArr ? reinterpret_cast<__u64>(txArr->vector()) : 0;
        xfers[i].len = static_cast<__u32>(length);
        if (rxRequested) {
            auto* rxArr = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, length);
            RETURN_IF_EXCEPTION(scope, {});
            xfers[i].rx_buf = reinterpret_cast<__u64>(rxArr->vector());
            rxSlots[i] = rxArr;
        }

        // Optional per-segment overrides.
        JSValue speedVal = seg->get(globalObject, speedId);
        RETURN_IF_EXCEPTION(scope, {});
        if (!speedVal.isUndefined()) {
            xfers[i].speed_hz = speedVal.toUInt32(globalObject);
            RETURN_IF_EXCEPTION(scope, {});
        }
        JSValue delayVal = seg->get(globalObject, delayId);
        RETURN_IF_EXCEPTION(scope, {});
        if (!delayVal.isUndefined()) {
            uint32_t d = delayVal.toUInt32(globalObject);
            RETURN_IF_EXCEPTION(scope, {});
            xfers[i].delay_usecs = static_cast<__u16>(d > 0xffff ? 0xffff : d);
        }
        JSValue bpwVal = seg->get(globalObject, bpwId);
        RETURN_IF_EXCEPTION(scope, {});
        if (!bpwVal.isUndefined()) {
            uint32_t b = bpwVal.toUInt32(globalObject);
            RETURN_IF_EXCEPTION(scope, {});
            xfers[i].bits_per_word = static_cast<__u8>(b);
        }
        JSValue csVal = seg->get(globalObject, csId);
        RETURN_IF_EXCEPTION(scope, {});
        if (!csVal.isUndefined()) {
            xfers[i].cs_change = csVal.toBoolean(globalObject) ? 1 : 0;
            RETURN_IF_EXCEPTION(scope, {});
        }
    }

    if (xioctl(fd, SPI_IOC_MESSAGE(static_cast<int>(len)), xfers.data()) < 0) {
        throwErrno(globalObject, scope, "transactSegments: SPI_IOC_MESSAGE");
        return {};
    }

    JSArray* result = constructEmptyArray(globalObject, nullptr, len);
    RETURN_IF_EXCEPTION(scope, {});
    for (unsigned i = 0; i < len; ++i) {
        if (rxSlots[i]) {
            result->putDirectIndex(globalObject, i, rxSlots[i]);
        } else {
            result->putDirectIndex(globalObject, i, jsUndefined());
        }
    }
    return JSValue::encode(result);
#endif
}

// ─── factory ───────────────────────────────────────────────────────────────
JSC::JSObject* createParabunSpi(JSC::JSGlobalObject* globalObject)
{
    auto& vm = JSC::getVM(globalObject);
    JSC::JSObject* object = JSC::constructEmptyObject(vm, globalObject->nullPrototypeObjectStructure());

    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "listDevices"_s), 0,
        functionSpiListDevices, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "openDevice"_s), 4,
        functionSpiOpenDevice, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "closeDevice"_s), 1,
        functionSpiCloseDevice, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "transfer"_s), 2,
        functionSpiTransfer, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "transactSegments"_s), 2,
        functionSpiTransactSegments, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    return object;
}

} // namespace Bun
