// Parabun: native Highway SIMD kernels exposed to bun:simd.
//
// The hand-assembled WASM v128 kernels in src/js/bun/simd.ts pay a copy-in
// cost — the JS typed array's bytes have to be copied into wasm.memory before
// the kernel can run. That copy dominates above ~4 MiB, which is why simd.ts
// hard-falls-back to JS tight loops past REDUCE_WASM_MAX_BYTES.
//
// This file replaces *that* large-N fallback with native HWY_FOREACH_TARGET
// kernels that read directly from the JS typed array's vector(). No copy, no
// WASM memory ceiling, runtime-dispatched to the best SIMD ISA the host
// supports (AVX-512 / AVX2 / NEON). Small/medium N still goes through the
// existing WASM path — the JS-side gating in simd.ts decides which is which.
//
// Pattern follows highway_strings.cpp: HWY_FOREACH_TARGET produces one *Impl
// symbol per target; HWY_EXPORT + HWY_DYNAMIC_DISPATCH wrap them in a single
// C-callable entry point selected at first call.

#include "root.h"
#include "parabun_simd_kernels.h"

#undef HWY_TARGET_INCLUDE
#define HWY_TARGET_INCLUDE "parabun_simd_kernels.cpp"
#include <hwy/foreach_target.h>

#include <hwy/highway.h>

#include <cstddef>
#include <cstdint>

HWY_BEFORE_NAMESPACE();
namespace Bun {
namespace HWY_NAMESPACE {

namespace hn = hwy::HWY_NAMESPACE;

// Reduction kernels return the horizontal sum of the SIMD accumulator after
// the main loop, plus the scalar tail. Using a single accumulator for the
// whole reduction means the SIMD lanes don't get cross-summed until the very
// end — this matches what the WASM kernels in simd.ts do, and what the JS
// tight-loop fallback does too (left-to-right scalar add). Floating-point
// associativity is not guaranteed across these three reduction orders, so
// large-N results may differ in the last ULP between paths. That is the same
// trade-off the WASM path already accepts.

float SumF32Impl(const float* HWY_RESTRICT a, size_t n)
{
    using D = hn::ScalableTag<float>;
    const D d;
    const size_t N = hn::Lanes(d);

    auto vacc = hn::Zero(d);
    size_t i = 0;
    const size_t simd_end = n - (n % N);
    for (; i < simd_end; i += N) {
        vacc = hn::Add(vacc, hn::LoadU(d, a + i));
    }
    float s = hn::ReduceSum(d, vacc);
    for (; i < n; ++i) s += a[i];
    return s;
}

double SumF64Impl(const double* HWY_RESTRICT a, size_t n)
{
    using D = hn::ScalableTag<double>;
    const D d;
    const size_t N = hn::Lanes(d);

    auto vacc = hn::Zero(d);
    size_t i = 0;
    const size_t simd_end = n - (n % N);
    for (; i < simd_end; i += N) {
        vacc = hn::Add(vacc, hn::LoadU(d, a + i));
    }
    double s = hn::ReduceSum(d, vacc);
    for (; i < n; ++i) s += a[i];
    return s;
}

float DotF32Impl(const float* HWY_RESTRICT a, const float* HWY_RESTRICT b, size_t n)
{
    using D = hn::ScalableTag<float>;
    const D d;
    const size_t N = hn::Lanes(d);

    auto vacc = hn::Zero(d);
    size_t i = 0;
    const size_t simd_end = n - (n % N);
    for (; i < simd_end; i += N) {
        // MulAdd(x, y, acc) == x*y + acc. Maps to FMA on targets that have it
        // (AVX2/AVX-512/NEON), to separate mul+add otherwise.
        vacc = hn::MulAdd(hn::LoadU(d, a + i), hn::LoadU(d, b + i), vacc);
    }
    float s = hn::ReduceSum(d, vacc);
    for (; i < n; ++i) s += a[i] * b[i];
    return s;
}

double DotF64Impl(const double* HWY_RESTRICT a, const double* HWY_RESTRICT b, size_t n)
{
    using D = hn::ScalableTag<double>;
    const D d;
    const size_t N = hn::Lanes(d);

    auto vacc = hn::Zero(d);
    size_t i = 0;
    const size_t simd_end = n - (n % N);
    for (; i < simd_end; i += N) {
        vacc = hn::MulAdd(hn::LoadU(d, a + i), hn::LoadU(d, b + i), vacc);
    }
    double s = hn::ReduceSum(d, vacc);
    for (; i < n; ++i) s += a[i] * b[i];
    return s;
}

} // namespace HWY_NAMESPACE
} // namespace Bun
HWY_AFTER_NAMESPACE();

#if HWY_ONCE

#include <JavaScriptCore/CallData.h>
#include <JavaScriptCore/JSCInlines.h>
#include <JavaScriptCore/JSGenericTypedArrayViewInlines.h>
#include <JavaScriptCore/JSObject.h>
#include <JavaScriptCore/JSTypedArrays.h>
#include <JavaScriptCore/ObjectConstructor.h>
#include <JavaScriptCore/TypedArrayType.h>

namespace Bun {

HWY_EXPORT(SumF32Impl);
HWY_EXPORT(SumF64Impl);
HWY_EXPORT(DotF32Impl);
HWY_EXPORT(DotF64Impl);

extern "C" {

float parabun_highway_sum_f32(const float* a, size_t n)
{
    return HWY_DYNAMIC_DISPATCH(SumF32Impl)(a, n);
}

double parabun_highway_sum_f64(const double* a, size_t n)
{
    return HWY_DYNAMIC_DISPATCH(SumF64Impl)(a, n);
}

float parabun_highway_dot_f32(const float* a, const float* b, size_t n)
{
    return HWY_DYNAMIC_DISPATCH(DotF32Impl)(a, b, n);
}

double parabun_highway_dot_f64(const double* a, const double* b, size_t n)
{
    return HWY_DYNAMIC_DISPATCH(DotF64Impl)(a, b, n);
}

} // extern "C"

using namespace JSC;

// Extract a typed-array data pointer + element length from a JSValue, gated on
// the requested JSC::JSType (e.g. Float32ArrayType). Returns false (with thrown
// TypeError) if the argument is not a typed array of the right shape, or if
// its backing buffer has been detached.
template<JSC::JSType ExpectedJSType, typename Elem>
static bool extractTypedArray(JSGlobalObject* globalObject, ThrowScope& scope,
    JSValue value, const char* paramName,
    const Elem*& outPtr, size_t& outLen)
{
    if (!value.isCell()) [[unlikely]] {
        throwTypeError(globalObject, scope, "expected typed array"_s);
        return false;
    }
    JSCell* cell = value.asCell();
    if (cell->type() != ExpectedJSType) [[unlikely]] {
        throwTypeError(globalObject, scope, "typed-array shape mismatch"_s);
        return false;
    }
    auto* view = jsCast<JSC::JSArrayBufferView*>(cell);
    void* data = view->vector();
    if (!data) [[unlikely]] {
        throwTypeError(globalObject, scope, "typed array is detached"_s);
        return false;
    }
    outPtr = static_cast<const Elem*>(data);
    outLen = view->length();
    return true;
}

JSC_DEFINE_HOST_FUNCTION(functionSumF32,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    const float* ptr = nullptr;
    size_t len = 0;
    if (!extractTypedArray<JSC::Float32ArrayType, float>(globalObject, scope,
            callFrame->argument(0), "a", ptr, len)) {
        return {};
    }
    if (len == 0) return JSValue::encode(jsNumber(0));
    return JSValue::encode(jsNumber(parabun_highway_sum_f32(ptr, len)));
}

JSC_DEFINE_HOST_FUNCTION(functionSumF64,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    const double* ptr = nullptr;
    size_t len = 0;
    if (!extractTypedArray<JSC::Float64ArrayType, double>(globalObject, scope,
            callFrame->argument(0), "a", ptr, len)) {
        return {};
    }
    if (len == 0) return JSValue::encode(jsNumber(0));
    return JSValue::encode(jsNumber(parabun_highway_sum_f64(ptr, len)));
}

JSC_DEFINE_HOST_FUNCTION(functionDotF32,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    const float* aPtr = nullptr;
    const float* bPtr = nullptr;
    size_t aLen = 0, bLen = 0;
    if (!extractTypedArray<JSC::Float32ArrayType, float>(globalObject, scope,
            callFrame->argument(0), "a", aPtr, aLen)) return {};
    if (!extractTypedArray<JSC::Float32ArrayType, float>(globalObject, scope,
            callFrame->argument(1), "b", bPtr, bLen)) return {};
    if (aLen != bLen) [[unlikely]] {
        throwTypeError(globalObject, scope, "dot: length mismatch"_s);
        return {};
    }
    if (aLen == 0) return JSValue::encode(jsNumber(0));
    return JSValue::encode(jsNumber(parabun_highway_dot_f32(aPtr, bPtr, aLen)));
}

JSC_DEFINE_HOST_FUNCTION(functionDotF64,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    const double* aPtr = nullptr;
    const double* bPtr = nullptr;
    size_t aLen = 0, bLen = 0;
    if (!extractTypedArray<JSC::Float64ArrayType, double>(globalObject, scope,
            callFrame->argument(0), "a", aPtr, aLen)) return {};
    if (!extractTypedArray<JSC::Float64ArrayType, double>(globalObject, scope,
            callFrame->argument(1), "b", bPtr, bLen)) return {};
    if (aLen != bLen) [[unlikely]] {
        throwTypeError(globalObject, scope, "dot: length mismatch"_s);
        return {};
    }
    if (aLen == 0) return JSValue::encode(jsNumber(0));
    return JSValue::encode(jsNumber(parabun_highway_dot_f64(aPtr, bPtr, aLen)));
}

JSC::JSObject* createParabunSimdKernels(JSC::JSGlobalObject* globalObject)
{
    auto& vm = JSC::getVM(globalObject);
    JSC::JSObject* object = JSC::constructEmptyObject(vm, globalObject->nullPrototypeObjectStructure());
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "sumF32"_s), 1,
        functionSumF32, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "sumF64"_s), 1,
        functionSumF64, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "dotF32"_s), 2,
        functionDotF32, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "dotF64"_s), 2,
        functionDotF64, ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    return object;
}

} // namespace Bun

#endif // HWY_ONCE
