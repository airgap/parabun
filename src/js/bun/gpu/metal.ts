// Parabun Metal backend for bun:gpu.
//
// Loaded by src/js/bun/gpu.ts — exposes a `Backend`-conforming object that
// drives Apple Silicon (and Intel Mac) GPUs via Metal. We reach Metal
// through two C entry points:
//   - MTLCreateSystemDefaultDevice from
//       /System/Library/Frameworks/Metal.framework/Metal
//   - objc_msgSend / sel_registerName from /usr/lib/libobjc.A.dylib
//
// Every non-bootstrap Metal call (name, newCommandQueue,
// newLibraryWithSource:options:error:, …) is an Obj-C message send
// dispatched through objc_msgSend.
//
// Phase 1 (this file): device detection + name. dot / matVec / matmul /
// simdMap fall back to bun:simd. MSL kernel for simdMapAffineF32 lands
// next — parallel to the PTX kernel in ./cuda.ts.
//
// Why Obj-C-from-FFI vs a C shim: Apple's Metal has exactly one C entry
// (MTLCreateSystemDefaultDevice); the rest is Obj-C. A C shim would need
// to be built + shipped per Mac arch, whereas libobjc is on every mac
// and the calling convention is stable. arm64 uses the same objc_msgSend
// symbol for all message signatures, so we just declare it once with the
// widest-typed signature we need and cast pointers at call sites.

const simd = require("../simd.ts");

type FArray = Float32Array | Float64Array;

const LIBOBJC = "/usr/lib/libobjc.A.dylib";
const METAL_FRAMEWORK = "/System/Library/Frameworks/Metal.framework/Metal";

type MetalSymbols = {
  MTLCreateSystemDefaultDevice: () => bigint; // id<MTLDevice>
};

type ObjcSymbols = {
  sel_registerName: (name: number) => bigint; // SEL
  objc_msgSend: (self: bigint, op: bigint) => bigint;
};

let metalLib: { symbols: MetalSymbols; close: () => void } | null = null;
let objcLib: { symbols: ObjcSymbols; close: () => void } | null = null;
let ffiPtr: ((x: any) => number) | null = null;
let CStringCtor: any = null;

let probed = false;
let probeResult = false;
let device: bigint = 0n;
let deviceName = "";

function tryLoad(): boolean {
  if (metalLib !== null && objcLib !== null) return true;
  try {
    const { dlopen, FFIType, ptr, CString } = require("../ffi.ts");
    ffiPtr = ptr;
    CStringCtor = CString;
    metalLib = dlopen(METAL_FRAMEWORK, {
      MTLCreateSystemDefaultDevice: { args: [], returns: FFIType.u64 },
    }) as any;
    objcLib = dlopen(LIBOBJC, {
      sel_registerName: { args: [FFIType.ptr], returns: FFIType.u64 },
      // All message sends we need in phase 1 are (id, SEL) -> id, so
      // one declaration suffices. Phase 2 will add linkSymbols entries
      // for typed variants (with f32/u32/ptr args) using the same
      // underlying address — arm64 has a unified objc_msgSend.
      objc_msgSend: { args: [FFIType.u64, FFIType.u64], returns: FFIType.u64 },
    }) as any;
    return true;
  } catch {
    metalLib = null;
    objcLib = null;
    return false;
  }
}

// sel_registerName canonicalizes — second call returns the same pointer —
// but we still save an FFI round-trip per dispatch by caching JS-side.
const selCache = new Map<string, bigint>();
function sel(name: string): bigint {
  const hit = selCache.get(name);
  if (hit !== undefined) return hit;
  const bytes = new TextEncoder().encode(name + "\0");
  const s = objcLib!.symbols.sel_registerName(ffiPtr!(bytes));
  selCache.set(name, s);
  return s;
}

function probe(): boolean {
  if (probed) return probeResult;
  probed = true;
  if (process.platform !== "darwin") return false;
  if (!tryLoad()) return false;

  const dev = metalLib!.symbols.MTLCreateSystemDefaultDevice();
  if (dev === 0n) return false;
  device = dev;

  // [[device name] UTF8String] → const char*. Any step returning nil
  // just leaves deviceName empty — probe still succeeds since we have
  // a device.
  const nsstr = objcLib!.symbols.objc_msgSend(dev, sel("name"));
  if (nsstr !== 0n) {
    const cstr = objcLib!.symbols.objc_msgSend(nsstr, sel("UTF8String"));
    if (cstr !== 0n) {
      try {
        deviceName = String(new CStringCtor(Number(cstr)));
      } catch {
        deviceName = "";
      }
    }
  }

  probeResult = true;
  return true;
}

function winsForSize(_op: string, _n: number, _elemBytes: number): boolean {
  // Phase 1: no kernel shipped yet, so the CPU path is always at least
  // as fast. Returning false keeps simdMap/matVec callers on bun:simd
  // without a second guard.
  return false;
}

function dot(a: FArray, b: FArray): number {
  return simd.dot(a, b);
}

function matVec(matrix: FArray, vector: FArray, nRows: number, nCols: number): FArray {
  return simd.matVec(matrix as any, vector as any, nRows, nCols);
}

function matmul(a: FArray, b: FArray, m: number, k: number, n: number): FArray {
  if (a.constructor !== b.constructor) {
    throw new TypeError(
      `a and b must both be Float32Array or both be Float64Array; got ${a.constructor.name} and ${b.constructor.name}`,
    );
  }
  const out = (a instanceof Float32Array ? new Float32Array(m * n) : new Float64Array(m * n)) as FArray;
  for (let i = 0; i < m; i++) {
    const aRow = i * k;
    const oRow = i * n;
    for (let p = 0; p < k; p++) {
      const av = a[aRow + p];
      if (av === 0) continue;
      const bRow = p * n;
      for (let j = 0; j < n; j++) out[oRow + j] += av * b[bRow + j];
    }
  }
  return out;
}

function simdMap(fn: (x: number, i: number) => number, a: FArray): FArray {
  return simd.simdMap(fn, a as any);
}

function dispose(): void {
  // The MTLDevice returned by MTLCreateSystemDefaultDevice is owned by
  // the runtime — it's a cached singleton, not a retained reference.
  // We just clear our probe cache so setBackend("auto") can re-probe.
  device = 0n;
  selCache.clear();
  probed = false;
  probeResult = false;
  deviceName = "";
}

function getDeviceName(): string {
  return deviceName;
}

export default {
  name: "metal" as const,
  probe,
  winsForSize,
  dot,
  matVec,
  matmul,
  simdMap,
  dispose,
  getDeviceName,
};
