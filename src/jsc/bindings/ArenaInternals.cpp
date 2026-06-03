#include "root.h"
#include "ArenaInternals.h"

#include <JavaScriptCore/CallData.h>
#include <JavaScriptCore/DeferGC.h>
#include <JavaScriptCore/Heap.h>
#include <JavaScriptCore/JSCInlines.h>
#include <JavaScriptCore/JSObject.h>
#include <JavaScriptCore/ObjectConstructor.h>
#include <JavaScriptCore/ProfilerDatabase.h>

namespace Bun {
using namespace JSC;

// Run fn() with JSC GC deferred for fn's synchronous duration, then request an
// async Eden collection. The DeferGC RAII guard increments the heap's deferral
// depth on construction and decrements on destruction; if a collection was
// requested while deferred, it fires on the last decrement. We additionally
// kick collectAsync() so the "scope ends → collection happens" guarantee holds
// even when the heap didn't cross threshold during fn.
//
// The DeferGC must live in an inner block so the dtor runs *before* the
// collectAsync call — otherwise the async collect would itself be deferred
// (becoming a no-op until function return) and the timing guarantee breaks.
JSC_DEFINE_HOST_FUNCTION(functionRunWithDeferredGC,
    (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);

    JSValue fnValue = callFrame->argument(0);
    CallData callData = JSC::getCallData(fnValue);
    if (callData.type == CallData::Type::None) [[unlikely]] {
        throwTypeError(globalObject, throwScope, "scope(fn): fn must be callable"_s);
        return {};
    }

    JSValue result;
    {
        DeferGC deferGC(vm);
        MarkedArgumentBuffer args;
        result = JSC::profiledCall(globalObject, ProfilingReason::API,
            fnValue, callData, jsUndefined(), args);
    }
    RETURN_IF_EXCEPTION(throwScope, {});

    vm.heap.collectAsync();
    return JSValue::encode(result);
}

JSC::JSObject* createArenaInternals(JSC::JSGlobalObject* globalObject)
{
    auto& vm = JSC::getVM(globalObject);
    JSC::JSObject* object = JSC::constructEmptyObject(vm, globalObject->nullPrototypeObjectStructure());
    object->putDirectNativeFunction(vm, globalObject,
        JSC::Identifier::fromString(vm, "runWithDeferredGC"_s), 1,
        functionRunWithDeferredGC,
        ImplementationVisibility::Public, JSC::NoIntrinsic, 0);
    return object;
}

} // namespace Bun
