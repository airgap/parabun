// Parabun: native I2C bindings for `parabun:i2c` (LYK-771 / PLAN-bun-hal).
//
// Linux i2c-dev character device wrapper. Combined-message transactions
// via I2C_RDWR + SMBus shortcuts via I2C_SMBUS. Same shape on RPi 4/5,
// Jetson, NUC + breakout.
//
// JS surface (called from src/js/bun/i2c.ts):
//   listBuses()                              → Array<{path, name, funcs}>
//   busInfo(path)                            → { path, name, funcs }
//   openBus(path)                            → BigInt fd
//   closeBus(fd)                             → void
//   read(fd, addr, length)                   → Uint8Array
//   write(fd, addr, bytes)                   → void
//   transact(fd, addr, segments)             → Array<Uint8Array | undefined>
//        // segments: [{write: Uint8Array} | {read: number}, ...]
//   smbusQuick(fd, addr, write)              → boolean (true = ack'd)
//   smbusReadByte(fd, addr, cmd)             → number 0..255
//   smbusReadWord(fd, addr, cmd)             → number 0..65535
//   smbusWriteByte(fd, addr, cmd, value)     → void
//   smbusWriteWord(fd, addr, cmd, value)     → void
//   smbusReadBlock(fd, addr, cmd)            → Uint8Array
//   smbusWriteBlock(fd, addr, cmd, bytes)    → void
//
// On non-Linux every entry point throws "parabun:i2c not yet implemented on
// this platform".

#include "root.h"
#include "parabun_i2c.h"

#include <JavaScriptCore/CallData.h>
#include <JavaScriptCore/JSArray.h>
#include <JavaScriptCore/JSArrayBuffer.h>
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
#include <linux/i2c.h>
#include <linux/i2c-dev.h>
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

// Read /sys/class/i2c-dev/<basename>/name. Returns empty string on failure
// — non-fatal, just label-quality.
std::string readBusName(const char* devName)
{
    std::string p = std::string("/sys/class/i2c-dev/") + devName + "/name";
    int fd = ::open(p.c_str(), O_RDONLY | O_CLOEXEC);
    if (fd < 0) return {};
    char buf[256];
    ssize_t n = ::read(fd, buf, sizeof(buf) - 1);
    ::close(fd);
    if (n <= 0) return {};
    buf[n] = '\0';
    // Strip trailing newline.
    while (n > 0 && (buf[n - 1] == '\n' || buf[n - 1] == '\r')) buf[--n] = '\0';
    return std::string(buf);
}

#endif // __linux__

} // anonymous namespace

// ─── listBuses ─────────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionListBuses,
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
        // Match i2c-N where N is digits.
        if (std::strncmp(n, "i2c-", 4) != 0) continue;
        const char* tail = n + 4;
        if (*tail == '\0') continue;
        bool allDigits = true;
        for (const char* p = tail; *p; ++p) {
            if (*p < '0' || *p > '9') { allDigits = false; break; }
        }
        if (!allDigits) continue;
        std::string path = std::string("/dev/") + n;
        std::string name = readBusName(n);
        // Probe the bus for I2C_FUNCS to surface capabilities.
        unsigned long funcs = 0;
        int fd = ::open(path.c_str(), O_RDWR | O_CLOEXEC);
        if (fd >= 0) {
            xioctl(fd, I2C_FUNCS, &funcs);
            ::close(fd);
        }

        JSObject* o = constructEmptyObject(globalObject, globalObject->objectPrototype());
        o->putDirect(vm, Identifier::fromString(vm, "path"_s), jsString(vm, String::fromUTF8(path.c_str())));
        o->putDirect(vm, Identifier::fromString(vm, "name"_s), jsString(vm, String::fromUTF8(name.c_str())));
        o->putDirect(vm, Identifier::fromString(vm, "funcs"_s),
            JSBigInt::createFrom(globalObject, static_cast<int64_t>(funcs)));
        arr->putDirectIndex(globalObject, idx++, o);
    }
    ::closedir(dir);
#endif
    return JSValue::encode(arr);
}

// ─── busInfo ───────────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionBusInfo,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:i2c not yet implemented on this platform"_s);
    return {};
#else
    if (callFrame->argumentCount() < 1) {
        throwTypeError(globalObject, scope, "busInfo(path) requires 1 argument"_s);
        return {};
    }
    String pathStr = callFrame->argument(0).toWTFString(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    auto utf8 = pathStr.utf8();
    int fd = ::open(utf8.data(), O_RDWR | O_CLOEXEC);
    if (fd < 0) {
        throwErrno(globalObject, scope, "busInfo");
        return {};
    }
    unsigned long funcs = 0;
    if (xioctl(fd, I2C_FUNCS, &funcs) < 0) {
        ::close(fd);
        throwErrno(globalObject, scope, "busInfo: I2C_FUNCS");
        return {};
    }
    ::close(fd);

    // Look up basename for sysfs name lookup.
    const char* slash = std::strrchr(utf8.data(), '/');
    const char* base = slash ? slash + 1 : utf8.data();
    std::string name = readBusName(base);

    JSObject* o = constructEmptyObject(globalObject, globalObject->objectPrototype());
    o->putDirect(vm, Identifier::fromString(vm, "path"_s), jsString(vm, pathStr));
    o->putDirect(vm, Identifier::fromString(vm, "name"_s), jsString(vm, String::fromUTF8(name.c_str())));
    o->putDirect(vm, Identifier::fromString(vm, "funcs"_s),
        JSBigInt::createFrom(globalObject, static_cast<int64_t>(funcs)));
    return JSValue::encode(o);
#endif
}

// ─── openBus ───────────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionOpenBus,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:i2c not yet implemented on this platform"_s);
    return {};
#else
    if (callFrame->argumentCount() < 1) {
        throwTypeError(globalObject, scope, "openBus(path) requires 1 argument"_s);
        return {};
    }
    String pathStr = callFrame->argument(0).toWTFString(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    auto utf8 = pathStr.utf8();
    int fd = ::open(utf8.data(), O_RDWR | O_CLOEXEC);
    if (fd < 0) {
        throwErrno(globalObject, scope, "openBus");
        return {};
    }
    return JSValue::encode(JSBigInt::createFrom(globalObject, static_cast<int64_t>(fd)));
#endif
}

// ─── closeBus ──────────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionCloseBus,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);
    JSValue v = callFrame->argument(0);
    if (!v.isBigInt()) return JSValue::encode(jsUndefined());
#if defined(__linux__)
    int fd = static_cast<int>(JSBigInt::toBigInt64(dynamicDowncast<JSBigInt>(v.asCell())));
    if (fd >= 0) ::close(fd);
#else
    (void)v;
#endif
    (void)scope;
    return JSValue::encode(jsUndefined());
}

#if defined(__linux__)
// Helper: extract bus fd + 7-bit address from JS args.
static bool extractFdAddr(JSGlobalObject* globalObject, ThrowScope& scope,
    CallFrame* callFrame, int& fdOut, uint16_t& addrOut, const char* prefix)
{
    if (callFrame->argumentCount() < 2) {
        throwTypeError(globalObject, scope,
            makeString(String::fromUTF8(prefix), ": fd and addr required"_s));
        return false;
    }
    JSValue fdVal = callFrame->argument(0);
    if (!fdVal.isBigInt()) {
        throwTypeError(globalObject, scope,
            makeString(String::fromUTF8(prefix), ": fd must be a BigInt"_s));
        return false;
    }
    fdOut = static_cast<int>(JSBigInt::toBigInt64(dynamicDowncast<JSBigInt>(fdVal.asCell())));
    uint32_t a = callFrame->argument(1).toUInt32(globalObject);
    if (scope.exception()) return false;
    if (a > 0x7F) {
        throwTypeError(globalObject, scope,
            makeString(String::fromUTF8(prefix), ": addr must be 0..127"_s));
        return false;
    }
    addrOut = static_cast<uint16_t>(a);
    return true;
}
#endif

// ─── read ──────────────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionRead,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:i2c not yet implemented on this platform"_s);
    return {};
#else
    int fd; uint16_t addr;
    if (!extractFdAddr(globalObject, scope, callFrame, fd, addr, "read")) return {};
    if (callFrame->argumentCount() < 3) {
        throwTypeError(globalObject, scope, "read(fd, addr, length) requires 3 arguments"_s);
        return {};
    }
    uint32_t length = callFrame->argument(2).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    if (length == 0 || length > 8192) {
        throwTypeError(globalObject, scope, "read: length must be 1..8192"_s);
        return {};
    }

    auto* zigGlobal = dynamicDowncast<Zig::GlobalObject>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    auto* u8 = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, length);
    RETURN_IF_EXCEPTION(scope, {});

    // Use I2C_RDWR with a single read message — works regardless of whether
    // the caller previously did I2C_SLAVE.
    struct i2c_msg msg;
    std::memset(&msg, 0, sizeof(msg));
    msg.addr = addr;
    msg.flags = I2C_M_RD;
    msg.len = length;
    msg.buf = static_cast<uint8_t*>(u8->vector());
    struct i2c_rdwr_ioctl_data ioctl_data;
    ioctl_data.msgs = &msg;
    ioctl_data.nmsgs = 1;
    if (xioctl(fd, I2C_RDWR, &ioctl_data) < 0) {
        throwErrno(globalObject, scope, "read: I2C_RDWR");
        return {};
    }
    return JSValue::encode(u8);
#endif
}

// ─── write ─────────────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionWrite,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:i2c not yet implemented on this platform"_s);
    return {};
#else
    int fd; uint16_t addr;
    if (!extractFdAddr(globalObject, scope, callFrame, fd, addr, "write")) return {};
    if (callFrame->argumentCount() < 3) {
        throwTypeError(globalObject, scope, "write(fd, addr, bytes) requires 3 arguments"_s);
        return {};
    }
    JSValue bytesVal = callFrame->argument(2);
    JSC::JSUint8Array* u8 = dynamicDowncast<JSC::JSUint8Array>(bytesVal);
    if (!u8) {
        throwTypeError(globalObject, scope, "write: bytes must be a Uint8Array"_s);
        return {};
    }
    size_t length = u8->byteLength();
    if (length == 0) {
        // Allow zero-length writes (e.g. SMBus quick command via this path).
    }
    if (length > 8192) {
        throwTypeError(globalObject, scope, "write: bytes too large"_s);
        return {};
    }
    uint8_t* data = static_cast<uint8_t*>(u8->vector());

    struct i2c_msg msg;
    std::memset(&msg, 0, sizeof(msg));
    msg.addr = addr;
    msg.flags = 0;
    msg.len = static_cast<uint16_t>(length);
    msg.buf = data;
    struct i2c_rdwr_ioctl_data ioctl_data;
    ioctl_data.msgs = &msg;
    ioctl_data.nmsgs = 1;
    if (xioctl(fd, I2C_RDWR, &ioctl_data) < 0) {
        throwErrno(globalObject, scope, "write: I2C_RDWR");
        return {};
    }
    return JSValue::encode(jsUndefined());
#endif
}

// ─── transact ──────────────────────────────────────────────────────────────
// Combined-message transaction. segments is an Array of objects:
//   { write: Uint8Array }   → outbound segment
//   { read: number }        → inbound segment (length bytes)
// Returns Array<Uint8Array | undefined> with one slot per segment (undefined
// for write segments to keep indices aligned).
JSC_DEFINE_HOST_FUNCTION(functionTransact,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:i2c not yet implemented on this platform"_s);
    return {};
#else
    int fd; uint16_t addr;
    if (!extractFdAddr(globalObject, scope, callFrame, fd, addr, "transact")) return {};
    if (callFrame->argumentCount() < 3) {
        throwTypeError(globalObject, scope, "transact(fd, addr, segments) requires 3 arguments"_s);
        return {};
    }
    JSValue segmentsVal = callFrame->argument(2);
    JSArray* segments = dynamicDowncast<JSArray>(segmentsVal);
    if (!segments) {
        throwTypeError(globalObject, scope, "transact: segments must be an array"_s);
        return {};
    }
    unsigned len = segments->length();
    if (len == 0 || len > I2C_RDWR_IOCTL_MAX_MSGS) {
        throwTypeError(globalObject, scope,
            makeString("transact: segments length must be 1.."_s,
                static_cast<unsigned>(I2C_RDWR_IOCTL_MAX_MSGS)));
        return {};
    }

    // Allocate JS-side Uint8Arrays for reads up front; their vector() is the
    // buffer the kernel writes into. Write segments point at the input
    // Uint8Array's vector() directly.
    auto* zigGlobal = dynamicDowncast<Zig::GlobalObject>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    std::vector<struct i2c_msg> msgs(len);
    std::vector<JSC::JSUint8Array*> readSlots(len, nullptr);
    Identifier writeId = Identifier::fromString(vm, "write"_s);
    Identifier readId = Identifier::fromString(vm, "read"_s);
    for (unsigned i = 0; i < len; ++i) {
        JSValue segVal = segments->getIndex(globalObject, i);
        RETURN_IF_EXCEPTION(scope, {});
        JSObject* segObj = dynamicDowncast<JSObject>(segVal);
        if (!segObj) {
            throwTypeError(globalObject, scope, "transact: each segment must be an object"_s);
            return {};
        }
        JSValue writeVal = segObj->get(globalObject, writeId);
        RETURN_IF_EXCEPTION(scope, {});
        JSValue readVal = segObj->get(globalObject, readId);
        RETURN_IF_EXCEPTION(scope, {});

        std::memset(&msgs[i], 0, sizeof(struct i2c_msg));
        msgs[i].addr = addr;

        if (!writeVal.isUndefined() && !writeVal.isNull()) {
            JSC::JSUint8Array* u8 = dynamicDowncast<JSC::JSUint8Array>(writeVal);
            if (!u8) {
                throwTypeError(globalObject, scope, "transact: write must be a Uint8Array"_s);
                return {};
            }
            size_t wlen = u8->byteLength();
            if (wlen > 8192) {
                throwTypeError(globalObject, scope, "transact: write segment too large"_s);
                return {};
            }
            msgs[i].flags = 0;
            msgs[i].len = static_cast<uint16_t>(wlen);
            msgs[i].buf = static_cast<uint8_t*>(u8->vector());
        } else if (!readVal.isUndefined() && !readVal.isNull()) {
            uint32_t rlen = readVal.toUInt32(globalObject);
            RETURN_IF_EXCEPTION(scope, {});
            if (rlen == 0 || rlen > 8192) {
                throwTypeError(globalObject, scope, "transact: read length must be 1..8192"_s);
                return {};
            }
            auto* u8 = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, rlen);
            RETURN_IF_EXCEPTION(scope, {});
            msgs[i].flags = I2C_M_RD;
            msgs[i].len = static_cast<uint16_t>(rlen);
            msgs[i].buf = static_cast<uint8_t*>(u8->vector());
            readSlots[i] = u8;
        } else {
            throwTypeError(globalObject, scope, "transact: each segment needs `write` or `read`"_s);
            return {};
        }
    }

    struct i2c_rdwr_ioctl_data ioctl_data;
    ioctl_data.msgs = msgs.data();
    ioctl_data.nmsgs = len;
    if (xioctl(fd, I2C_RDWR, &ioctl_data) < 0) {
        throwErrno(globalObject, scope, "transact: I2C_RDWR");
        return {};
    }

    JSArray* result = constructEmptyArray(globalObject, nullptr, len);
    RETURN_IF_EXCEPTION(scope, {});
    for (unsigned i = 0; i < len; ++i) {
        if (readSlots[i]) {
            result->putDirectIndex(globalObject, i, readSlots[i]);
        } else {
            result->putDirectIndex(globalObject, i, jsUndefined());
        }
    }
    return JSValue::encode(result);
#endif
}

#if defined(__linux__)
// Run an SMBus ioctl with the given args.
static bool smbusXfer(int fd, uint16_t addr, char readWrite, uint8_t cmd,
    int size, union i2c_smbus_data* data)
{
    if (xioctl(fd, I2C_SLAVE, reinterpret_cast<void*>(static_cast<uintptr_t>(addr))) < 0) {
        return false;
    }
    struct i2c_smbus_ioctl_data args;
    args.read_write = readWrite;
    args.command = cmd;
    args.size = size;
    args.data = data;
    return xioctl(fd, I2C_SMBUS, &args) >= 0;
}
#endif

// ─── smbusQuick ────────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionSmbusQuick,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:i2c not yet implemented on this platform"_s);
    return {};
#else
    int fd; uint16_t addr;
    if (!extractFdAddr(globalObject, scope, callFrame, fd, addr, "smbusQuick")) return {};
    bool write = callFrame->argument(2).toBoolean(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    if (xioctl(fd, I2C_SLAVE, reinterpret_cast<void*>(static_cast<uintptr_t>(addr))) < 0) {
        return JSValue::encode(jsBoolean(false));
    }
    struct i2c_smbus_ioctl_data args;
    args.read_write = write ? I2C_SMBUS_WRITE : I2C_SMBUS_READ;
    args.command = 0;
    args.size = I2C_SMBUS_QUICK;
    args.data = nullptr;
    bool ok = xioctl(fd, I2C_SMBUS, &args) >= 0;
    return JSValue::encode(jsBoolean(ok));
#endif
}

// ─── smbusReadByte ─────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionSmbusReadByte,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:i2c not yet implemented on this platform"_s);
    return {};
#else
    int fd; uint16_t addr;
    if (!extractFdAddr(globalObject, scope, callFrame, fd, addr, "smbusReadByte")) return {};
    uint32_t cmd = callFrame->argument(2).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    union i2c_smbus_data data;
    if (!smbusXfer(fd, addr, I2C_SMBUS_READ, static_cast<uint8_t>(cmd),
                   I2C_SMBUS_BYTE_DATA, &data)) {
        throwErrno(globalObject, scope, "smbusReadByte");
        return {};
    }
    return JSValue::encode(jsNumber(data.byte));
#endif
}

// ─── smbusReadWord ─────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionSmbusReadWord,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:i2c not yet implemented on this platform"_s);
    return {};
#else
    int fd; uint16_t addr;
    if (!extractFdAddr(globalObject, scope, callFrame, fd, addr, "smbusReadWord")) return {};
    uint32_t cmd = callFrame->argument(2).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    union i2c_smbus_data data;
    if (!smbusXfer(fd, addr, I2C_SMBUS_READ, static_cast<uint8_t>(cmd),
                   I2C_SMBUS_WORD_DATA, &data)) {
        throwErrno(globalObject, scope, "smbusReadWord");
        return {};
    }
    return JSValue::encode(jsNumber(data.word));
#endif
}

// ─── smbusWriteByte ────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionSmbusWriteByte,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:i2c not yet implemented on this platform"_s);
    return {};
#else
    int fd; uint16_t addr;
    if (!extractFdAddr(globalObject, scope, callFrame, fd, addr, "smbusWriteByte")) return {};
    if (callFrame->argumentCount() < 4) {
        throwTypeError(globalObject, scope, "smbusWriteByte(fd, addr, cmd, value) requires 4 arguments"_s);
        return {};
    }
    uint32_t cmd = callFrame->argument(2).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    uint32_t value = callFrame->argument(3).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    union i2c_smbus_data data;
    data.byte = static_cast<uint8_t>(value);
    if (!smbusXfer(fd, addr, I2C_SMBUS_WRITE, static_cast<uint8_t>(cmd),
                   I2C_SMBUS_BYTE_DATA, &data)) {
        throwErrno(globalObject, scope, "smbusWriteByte");
        return {};
    }
    return JSValue::encode(jsUndefined());
#endif
}

// ─── smbusWriteWord ────────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionSmbusWriteWord,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:i2c not yet implemented on this platform"_s);
    return {};
#else
    int fd; uint16_t addr;
    if (!extractFdAddr(globalObject, scope, callFrame, fd, addr, "smbusWriteWord")) return {};
    if (callFrame->argumentCount() < 4) {
        throwTypeError(globalObject, scope, "smbusWriteWord(fd, addr, cmd, value) requires 4 arguments"_s);
        return {};
    }
    uint32_t cmd = callFrame->argument(2).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    uint32_t value = callFrame->argument(3).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    union i2c_smbus_data data;
    data.word = static_cast<uint16_t>(value);
    if (!smbusXfer(fd, addr, I2C_SMBUS_WRITE, static_cast<uint8_t>(cmd),
                   I2C_SMBUS_WORD_DATA, &data)) {
        throwErrno(globalObject, scope, "smbusWriteWord");
        return {};
    }
    return JSValue::encode(jsUndefined());
#endif
}

// ─── smbusReadBlock ────────────────────────────────────────────────────────
// SMBus block read (variable length, length byte returned by the device).
JSC_DEFINE_HOST_FUNCTION(functionSmbusReadBlock,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:i2c not yet implemented on this platform"_s);
    return {};
#else
    int fd; uint16_t addr;
    if (!extractFdAddr(globalObject, scope, callFrame, fd, addr, "smbusReadBlock")) return {};
    uint32_t cmd = callFrame->argument(2).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    union i2c_smbus_data data;
    if (!smbusXfer(fd, addr, I2C_SMBUS_READ, static_cast<uint8_t>(cmd),
                   I2C_SMBUS_BLOCK_DATA, &data)) {
        throwErrno(globalObject, scope, "smbusReadBlock");
        return {};
    }
    uint8_t blockLen = data.block[0];
    if (blockLen > I2C_SMBUS_BLOCK_MAX) blockLen = I2C_SMBUS_BLOCK_MAX;

    auto* zigGlobal = dynamicDowncast<Zig::GlobalObject>(globalObject);
    auto* subclassStructure = zigGlobal->JSBufferSubclassStructure();
    auto* u8 = JSC::JSUint8Array::createUninitialized(globalObject, subclassStructure, blockLen);
    RETURN_IF_EXCEPTION(scope, {});
    if (blockLen) std::memcpy(u8->vector(), &data.block[1], blockLen);
    return JSValue::encode(u8);
#endif
}

// ─── smbusWriteBlock ───────────────────────────────────────────────────────
JSC_DEFINE_HOST_FUNCTION(functionSmbusWriteBlock,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

#if !defined(__linux__)
    throwTypeError(globalObject, scope, "parabun:i2c not yet implemented on this platform"_s);
    return {};
#else
    int fd; uint16_t addr;
    if (!extractFdAddr(globalObject, scope, callFrame, fd, addr, "smbusWriteBlock")) return {};
    if (callFrame->argumentCount() < 4) {
        throwTypeError(globalObject, scope, "smbusWriteBlock(fd, addr, cmd, bytes) requires 4 arguments"_s);
        return {};
    }
    uint32_t cmd = callFrame->argument(2).toUInt32(globalObject);
    RETURN_IF_EXCEPTION(scope, {});
    JSC::JSUint8Array* u8 = dynamicDowncast<JSC::JSUint8Array>(callFrame->argument(3));
    if (!u8) {
        throwTypeError(globalObject, scope, "smbusWriteBlock: bytes must be a Uint8Array"_s);
        return {};
    }
    size_t blockLen = u8->byteLength();
    if (blockLen == 0 || blockLen > I2C_SMBUS_BLOCK_MAX) {
        throwTypeError(globalObject, scope,
            makeString("smbusWriteBlock: block length must be 1.."_s,
                static_cast<unsigned>(I2C_SMBUS_BLOCK_MAX)));
        return {};
    }
    union i2c_smbus_data data;
    data.block[0] = static_cast<uint8_t>(blockLen);
    std::memcpy(&data.block[1], u8->vector(), blockLen);
    if (!smbusXfer(fd, addr, I2C_SMBUS_WRITE, static_cast<uint8_t>(cmd),
                   I2C_SMBUS_BLOCK_DATA, &data)) {
        throwErrno(globalObject, scope, "smbusWriteBlock");
        return {};
    }
    return JSValue::encode(jsUndefined());
#endif
}

// ─── factory ───────────────────────────────────────────────────────────────
JSC::JSObject* createParabunI2c(JSC::JSGlobalObject* globalObject)
{
    auto& vm = JSC::getVM(globalObject);
    JSC::JSObject* object = JSC::constructEmptyObject(vm, globalObject->nullPrototypeObjectStructure());

    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "listBuses"_s), 0,
        functionListBuses, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "busInfo"_s), 1,
        functionBusInfo, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "openBus"_s), 1,
        functionOpenBus, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "closeBus"_s), 1,
        functionCloseBus, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "read"_s), 3,
        functionRead, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "write"_s), 3,
        functionWrite, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "transact"_s), 3,
        functionTransact, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "smbusQuick"_s), 3,
        functionSmbusQuick, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "smbusReadByte"_s), 3,
        functionSmbusReadByte, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "smbusReadWord"_s), 3,
        functionSmbusReadWord, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "smbusWriteByte"_s), 4,
        functionSmbusWriteByte, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "smbusWriteWord"_s), 4,
        functionSmbusWriteWord, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "smbusReadBlock"_s), 3,
        functionSmbusReadBlock, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "smbusWriteBlock"_s), 4,
        functionSmbusWriteBlock, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    return object;
}

} // namespace Bun
