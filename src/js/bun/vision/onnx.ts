// Hardcoded module "parabun:vision/onnx" (private to parabun:vision)
//
// FFI bindings for ONNX Runtime (≥1.16, C API). System-installed
// dependency — same lazy-probe pattern as parabun:gpu's libcuda and
// vision/tesseract.ts. Users install via:
//   apt install libonnxruntime-dev          # only on a few Debian variants
//   brew install onnxruntime                # macOS Homebrew
//   curl -L https://github.com/microsoft/onnxruntime/releases/.../onnxruntime-linux-x64-1.21.0.tgz \
//     -o ort.tgz && tar -xzf ort.tgz -C /opt/    # then point ORT_LIB at the .so
//
// The ORT C ABI is unusual: it doesn't expose flat C symbols. Instead
// `OrtGetApiBase()` (a single flat symbol) returns an `OrtApiBase*` whose
// first field is `GetApi(version)`, which returns an `OrtApi*` — a struct
// of ~150 function pointers at version-pinned offsets. We:
//
//   1. dlopen libonnxruntime + bind OrtGetApiBase
//   2. Call OrtGetApiBase() → bigint (OrtApiBase*)
//   3. Read OrtApiBase[0] (GetApi function pointer) via ffi.read.u64
//   4. Bind GetApi via ffi.linkSymbols (raw function-pointer support)
//   5. Call GetApi(ORT_API_VERSION) → bigint (OrtApi*)
//   6. Read each needed function pointer from OrtApi at its known offset
//   7. Bind them all via a second ffi.linkSymbols call
//
// Offsets are version-pinned: ORT freezes existing fields and only
// appends new ones in later API versions. ORT_API_VERSION 16 → matches
// the 1.16+ release line; the offsets below were derived from the
// upstream onnxruntime_c_api.h at v1.16.0.

const ffi = require("../ffi.ts");

const SO_CANDIDATES =
  process.platform === "darwin"
    ? ["libonnxruntime.dylib", "libonnxruntime.1.dylib"]
    : process.platform === "win32"
      ? ["onnxruntime.dll"]
      : ["libonnxruntime.so.1", "libonnxruntime.so"];

const ORT_API_VERSION = 16;

// ONNXTensorElementDataType (subset — only what the JS surface exposes).
const TENSOR_FLOAT = 1; // float32
const TENSOR_INT64 = 7;

// OrtAllocatorType + OrtMemType (only the values we need).
const ORT_ALLOCATOR_TYPE_DEVICE = 1; // OrtArenaAllocator
const ORT_MEM_TYPE_DEFAULT = 0;

// OrtLoggingLevel — WARNING is the v1 default; quieter than INFO.
const ORT_LOGGING_LEVEL_WARNING = 2;

type OrtSymbols = {
  GetErrorMessage: (status: bigint) => bigint;
  CreateEnv: (severity: number, logid: number, env: number) => bigint;
  CreateSession: (env: bigint, modelPath: number, opts: bigint, session: number) => bigint;
  Run: (
    session: bigint,
    runOpts: number, // null
    inputNames: number,
    inputs: number,
    inputCount: bigint,
    outputNames: number,
    outputCount: bigint,
    outputs: number,
  ) => bigint;
  CreateSessionOptions: (out: number) => bigint;
  SessionGetInputCount: (session: bigint, out: number) => bigint;
  SessionGetOutputCount: (session: bigint, out: number) => bigint;
  SessionGetInputName: (session: bigint, idx: bigint, alloc: bigint, out: number) => bigint;
  SessionGetOutputName: (session: bigint, idx: bigint, alloc: bigint, out: number) => bigint;
  CreateTensorWithDataAsOrtValue: (
    info: bigint,
    pData: number,
    dataLen: bigint,
    shape: number,
    shapeLen: bigint,
    elemType: number,
    out: number,
  ) => bigint;
  GetTensorMutableData: (value: bigint, out: number) => bigint;
  GetDimensionsCount: (info: bigint, out: number) => bigint;
  GetDimensions: (info: bigint, dims: number, dimsLen: bigint) => bigint;
  GetTensorTypeAndShape: (value: bigint, out: number) => bigint;
  CreateCpuMemoryInfo: (allocType: number, memType: number, out: number) => bigint;
  AllocatorFree: (alloc: bigint, p: number) => bigint;
  GetAllocatorWithDefaultOptions: (out: number) => bigint;
  ReleaseEnv: (env: bigint) => void;
  ReleaseStatus: (status: bigint) => void;
  ReleaseMemoryInfo: (info: bigint) => void;
  ReleaseSession: (session: bigint) => void;
  ReleaseValue: (value: bigint) => void;
  ReleaseTensorTypeAndShapeInfo: (info: bigint) => void;
  ReleaseSessionOptions: (opts: bigint) => void;
};

// OrtApi struct field indices (ORT_API_VERSION 16). Each index = 8-byte
// stride into the struct. Derived from upstream
// onnxruntime_c_api.h@v1.16.0. Adding a new function: find its order in
// the canonical struct, add index here.
const ORT_API_INDEX: Record<keyof OrtSymbols, number> = {
  // Pre-ORT_API2_STATUS fields (the first three are plain function
  // pointers; CreateStatus is at 0, GetErrorCode at 1, GetErrorMessage
  // at 2).
  GetErrorMessage: 2,
  CreateEnv: 3,
  CreateSession: 7,
  Run: 9,
  CreateSessionOptions: 10,
  SessionGetInputCount: 30,
  SessionGetOutputCount: 31,
  SessionGetInputName: 36,
  SessionGetOutputName: 37,
  CreateTensorWithDataAsOrtValue: 49,
  GetTensorMutableData: 51,
  GetDimensionsCount: 61,
  GetDimensions: 62,
  GetTensorTypeAndShape: 65,
  CreateCpuMemoryInfo: 69,
  AllocatorFree: 76,
  GetAllocatorWithDefaultOptions: 78,
  // Release block (right after the pre-1.4 ABI segment).
  ReleaseEnv: 92,
  ReleaseStatus: 93,
  ReleaseMemoryInfo: 94,
  ReleaseSession: 95,
  ReleaseValue: 96,
  ReleaseTensorTypeAndShapeInfo: 99,
  ReleaseSessionOptions: 100,
};

function signatureFor(name: keyof OrtSymbols) {
  const T = ffi.FFIType;
  switch (name) {
    case "GetErrorMessage":
      return { args: [T.u64], returns: T.u64 };
    case "CreateEnv":
      return { args: [T.i32, T.ptr, T.ptr], returns: T.u64 };
    case "CreateSession":
      return { args: [T.u64, T.ptr, T.u64, T.ptr], returns: T.u64 };
    case "Run":
      return {
        args: [T.u64, T.ptr, T.ptr, T.ptr, T.u64, T.ptr, T.u64, T.ptr],
        returns: T.u64,
      };
    case "CreateSessionOptions":
      return { args: [T.ptr], returns: T.u64 };
    case "SessionGetInputCount":
    case "SessionGetOutputCount":
      return { args: [T.u64, T.ptr], returns: T.u64 };
    case "SessionGetInputName":
    case "SessionGetOutputName":
      return { args: [T.u64, T.u64, T.u64, T.ptr], returns: T.u64 };
    case "CreateTensorWithDataAsOrtValue":
      return {
        args: [T.u64, T.ptr, T.u64, T.ptr, T.u64, T.i32, T.ptr],
        returns: T.u64,
      };
    case "GetTensorMutableData":
      return { args: [T.u64, T.ptr], returns: T.u64 };
    case "GetDimensionsCount":
      return { args: [T.u64, T.ptr], returns: T.u64 };
    case "GetDimensions":
      return { args: [T.u64, T.ptr, T.u64], returns: T.u64 };
    case "GetTensorTypeAndShape":
      return { args: [T.u64, T.ptr], returns: T.u64 };
    case "CreateCpuMemoryInfo":
      return { args: [T.i32, T.i32, T.ptr], returns: T.u64 };
    case "AllocatorFree":
      return { args: [T.u64, T.ptr], returns: T.u64 };
    case "GetAllocatorWithDefaultOptions":
      return { args: [T.ptr], returns: T.u64 };
    case "ReleaseEnv":
    case "ReleaseStatus":
    case "ReleaseMemoryInfo":
    case "ReleaseSession":
    case "ReleaseValue":
    case "ReleaseTensorTypeAndShapeInfo":
    case "ReleaseSessionOptions":
      return { args: [T.u64], returns: T.void };
  }
}

let baseLib: { symbols: { OrtGetApiBase: () => bigint }; close: () => void } | null = null;
let api: OrtSymbols | null = null;
let probed = false;
let probeError: string | null = null;

// Override the soname search via env. Useful for users who have ORT
// installed under /opt or downloaded the GitHub release tarball into a
// non-standard prefix: `PARABUN_ONNX_LIB=/opt/onnxruntime-*/lib/libonnxruntime.so`.
function probe(): boolean {
  if (probed) return api !== null;
  probed = true;
  const explicit = (globalThis as any).process?.env?.PARABUN_ONNX_LIB;
  const candidates = explicit ? [explicit] : SO_CANDIDATES;

  for (const name of candidates) {
    try {
      baseLib = ffi.dlopen(name, {
        OrtGetApiBase: { args: [], returns: ffi.FFIType.u64 },
      }) as any;

      const apiBasePtr = baseLib!.symbols.OrtGetApiBase();
      if (apiBasePtr === 0n) {
        baseLib!.close();
        baseLib = null;
        continue;
      }

      // OrtApiBase struct layout:
      //   const OrtApi* (*GetApi)(uint32_t version);  // offset 0
      //   const char*   (*GetVersionString)();         // offset 8
      const getApiFnPtr = ffi.read.u64(Number(apiBasePtr), 0);
      if (!getApiFnPtr || getApiFnPtr === 0n) {
        baseLib!.close();
        baseLib = null;
        continue;
      }

      const getApiLib = ffi.linkSymbols({
        GetApi: { args: [ffi.FFIType.u32], returns: ffi.FFIType.u64, ptr: getApiFnPtr },
      });
      const apiPtr = getApiLib.symbols.GetApi(ORT_API_VERSION);
      if (apiPtr === 0n) {
        baseLib!.close();
        baseLib = null;
        probeError = `OrtApiBase.GetApi(${ORT_API_VERSION}) returned null — ORT version too old?`;
        continue;
      }

      // Read each needed function pointer from OrtApi at its known
      // offset, then linkSymbols the whole bundle.
      const apiPtrNum = Number(apiPtr);
      const defs: Record<string, { args: number[]; returns: number; ptr: bigint }> = {};
      for (const [name, idx] of Object.entries(ORT_API_INDEX) as [keyof OrtSymbols, number][]) {
        const fnPtr = ffi.read.u64(apiPtrNum, idx * 8);
        if (!fnPtr || fnPtr === 0n) {
          probeError = `ORT function ${name} (idx ${idx}) is null in OrtApi struct — ABI mismatch?`;
          baseLib!.close();
          baseLib = null;
          api = null;
          break;
        }
        defs[name] = { ...signatureFor(name), ptr: fnPtr };
      }
      if (api === null && baseLib === null) continue;

      const apiLib = ffi.linkSymbols(defs);
      api = apiLib.symbols as OrtSymbols;
      probeError = null;
      return true;
    } catch (e) {
      probeError = (e as Error).message;
      // Try next candidate.
    }
  }
  return false;
}

// Read a Status* — non-zero means error. Pull the message via
// GetErrorMessage (returns const char*, do NOT free), copy to a JS
// string, then ReleaseStatus to drop the C-side allocation. Always-throw
// helper so callers can write `chk(api.Foo(...))` linearly.
function chk(status: bigint, what: string): void {
  if (status === 0n) return;
  const msgPtr = api!.GetErrorMessage(status);
  const msg = msgPtr === 0n ? "(no message)" : String(new ffi.CString(Number(msgPtr)));
  api!.ReleaseStatus(status);
  throw new Error(`parabun:vision.onnx: ${what} failed: ${msg}`);
}

// Read a UTF-8 string allocated via the ORT default allocator. Caller
// must free the original ptr via AllocatorFree when done — this helper
// just copies + returns the JS string.
function readCString(ptr: bigint): string {
  if (ptr === 0n) return "";
  return String(new ffi.CString(Number(ptr)));
}

type CreateOpts = {
  /** Override the .so/.dylib path. Falls through to PARABUN_ONNX_LIB env, then platform defaults. */
  libPath?: string;
};

type SessionInputInfo = {
  name: string;
  /** Static dim sizes; -1 marks dynamic dims (batch, seq, etc.). */
  dims: number[];
};

class Session {
  #env: bigint;
  #opts: bigint;
  #session: bigint;
  #memInfo: bigint;
  #allocator: bigint;
  #disposed = false;
  readonly inputs: SessionInputInfo[];
  readonly outputs: SessionInputInfo[];

  constructor(modelPath: string) {
    if (!probe()) {
      throw new Error(
        `parabun:vision.onnx: libonnxruntime not loadable. Install via:\n` +
          `  brew install onnxruntime                                    # macOS\n` +
          `  apt install libonnxruntime-dev                              # some Linux\n` +
          `Or download a release from github.com/microsoft/onnxruntime and point at it:\n` +
          `  PARABUN_ONNX_LIB=/path/to/libonnxruntime.so.1 …\n` +
          (probeError ? `Probe error: ${probeError}\n` : "") +
          `Searched: ${SO_CANDIDATES.join(", ")}`,
      );
    }
    const a = api!;

    // 1. CreateEnv
    const logid = new TextEncoder().encode("parabun\0");
    const envBuf = new BigUint64Array(1);
    chk(a.CreateEnv(ORT_LOGGING_LEVEL_WARNING, ffi.ptr(logid), ffi.ptr(envBuf)), "CreateEnv");
    this.#env = envBuf[0];

    try {
      // 2. CreateSessionOptions (defaults are fine for v1)
      const optsBuf = new BigUint64Array(1);
      chk(a.CreateSessionOptions(ffi.ptr(optsBuf)), "CreateSessionOptions");
      this.#opts = optsBuf[0];

      // 3. CreateSession
      const pathBytes = new TextEncoder().encode(modelPath + "\0");
      const sessBuf = new BigUint64Array(1);
      chk(a.CreateSession(this.#env, ffi.ptr(pathBytes), this.#opts, ffi.ptr(sessBuf)), "CreateSession");
      this.#session = sessBuf[0];

      // 4. Allocator + memory info for tensor creation.
      const allocBuf = new BigUint64Array(1);
      chk(a.GetAllocatorWithDefaultOptions(ffi.ptr(allocBuf)), "GetAllocatorWithDefaultOptions");
      this.#allocator = allocBuf[0];

      const memBuf = new BigUint64Array(1);
      chk(
        a.CreateCpuMemoryInfo(ORT_ALLOCATOR_TYPE_DEVICE, ORT_MEM_TYPE_DEFAULT, ffi.ptr(memBuf)),
        "CreateCpuMemoryInfo",
      );
      this.#memInfo = memBuf[0];

      // 5. Enumerate inputs + outputs (names, shapes).
      this.inputs = this.#enumerate("input");
      this.outputs = this.#enumerate("output");
    } catch (e) {
      this.dispose();
      throw e;
    }
  }

  #enumerate(kind: "input" | "output"): SessionInputInfo[] {
    const a = api!;
    const countBuf = new BigUint64Array(1);
    chk(
      kind === "input"
        ? a.SessionGetInputCount(this.#session, ffi.ptr(countBuf))
        : a.SessionGetOutputCount(this.#session, ffi.ptr(countBuf)),
      `SessionGet${kind === "input" ? "Input" : "Output"}Count`,
    );
    const count = Number(countBuf[0]);
    const out: SessionInputInfo[] = [];
    for (let i = 0; i < count; i++) {
      const nameBuf = new BigUint64Array(1);
      chk(
        kind === "input"
          ? a.SessionGetInputName(this.#session, BigInt(i), this.#allocator, ffi.ptr(nameBuf))
          : a.SessionGetOutputName(this.#session, BigInt(i), this.#allocator, ffi.ptr(nameBuf)),
        `SessionGet${kind === "input" ? "Input" : "Output"}Name`,
      );
      const namePtr = nameBuf[0];
      const name = readCString(namePtr);
      // Free the allocator's copy of the name now that we have JS string.
      a.AllocatorFree(this.#allocator, Number(namePtr));
      // Type+shape info isn't critical for v1 (caller knows their model).
      // Skip the GetInputTypeInfo path — just record the name.
      out.push({ name, dims: [] });
    }
    return out;
  }

  /**
   * Run inference. Inputs is a `Record<inputName, Float32Array>` plus a
   * shape per input. Outputs returns a `Map<outputName, { data,
   * shape }>`. v1 supports only float32 tensors; non-float inputs would
   * need separate paths.
   */
  run(
    inputs: Record<string, { data: Float32Array; shape: number[] }>,
  ): Map<string, { data: Float32Array; shape: number[] }> {
    if (this.#disposed) throw new Error("parabun:vision.onnx: session is disposed");
    const a = api!;

    const inputNames = Object.keys(inputs);
    if (inputNames.length === 0) throw new Error("parabun:vision.onnx: no inputs supplied");

    // Pin name buffers + tensor values for the duration of the Run call.
    // ORT borrows pointers; releasing too early would crash.
    const nameBufs = inputNames.map(n => new TextEncoder().encode(n + "\0"));
    const namePtrs = new BigUint64Array(inputNames.length);
    for (let i = 0; i < nameBufs.length; i++) namePtrs[i] = BigInt(ffi.ptr(nameBufs[i]));

    // Outputs — one slot per declared output of the model. (Assume
    // caller wants all outputs.)
    const outputNames = this.outputs.map(o => o.name);
    const outNameBufs = outputNames.map(n => new TextEncoder().encode(n + "\0"));
    const outNamePtrs = new BigUint64Array(outputNames.length);
    for (let i = 0; i < outNameBufs.length; i++) outNamePtrs[i] = BigInt(ffi.ptr(outNameBufs[i]));

    // Build OrtValue tensors for each input via CreateTensorWithDataAsOrtValue.
    const inputValues = new BigUint64Array(inputNames.length);
    const shapeBufs: BigInt64Array[] = []; // keep alive
    for (let i = 0; i < inputNames.length; i++) {
      const { data, shape } = inputs[inputNames[i]];
      const shapeBuf = new BigInt64Array(shape.map(s => BigInt(s)));
      shapeBufs.push(shapeBuf);
      const valBuf = new BigUint64Array(1);
      chk(
        a.CreateTensorWithDataAsOrtValue(
          this.#memInfo,
          ffi.ptr(data),
          BigInt(data.byteLength),
          ffi.ptr(shapeBuf),
          BigInt(shape.length),
          TENSOR_FLOAT,
          ffi.ptr(valBuf),
        ),
        `CreateTensorWithDataAsOrtValue(${inputNames[i]})`,
      );
      inputValues[i] = valBuf[0];
    }

    // Output value slots — initialised to 0; ORT allocates internally
    // and writes the OrtValue pointer back.
    const outputValues = new BigUint64Array(outputNames.length);

    try {
      chk(
        a.Run(
          this.#session,
          0, // null run options
          ffi.ptr(namePtrs),
          ffi.ptr(inputValues),
          BigInt(inputNames.length),
          ffi.ptr(outNamePtrs),
          BigInt(outputNames.length),
          ffi.ptr(outputValues),
        ),
        "Run",
      );

      // Read each output's shape + data.
      const out = new Map<string, { data: Float32Array; shape: number[] }>();
      for (let i = 0; i < outputNames.length; i++) {
        const valPtr = outputValues[i];
        try {
          const tinfoBuf = new BigUint64Array(1);
          chk(a.GetTensorTypeAndShape(valPtr, ffi.ptr(tinfoBuf)), "GetTensorTypeAndShape");
          const tinfo = tinfoBuf[0];
          try {
            const ndimBuf = new BigUint64Array(1);
            chk(a.GetDimensionsCount(tinfo, ffi.ptr(ndimBuf)), "GetDimensionsCount");
            const ndim = Number(ndimBuf[0]);
            const dimsBuf = new BigInt64Array(ndim);
            chk(a.GetDimensions(tinfo, ffi.ptr(dimsBuf), BigInt(ndim)), "GetDimensions");
            const shape: number[] = [];
            let total = 1;
            for (let d = 0; d < ndim; d++) {
              const v = Number(dimsBuf[d]);
              shape.push(v);
              total *= v < 0 ? 1 : v; // dynamic dim → runtime shape, but should be concrete here
            }

            const dataPtrBuf = new BigUint64Array(1);
            chk(a.GetTensorMutableData(valPtr, ffi.ptr(dataPtrBuf)), "GetTensorMutableData");
            const dataPtr = Number(dataPtrBuf[0]);
            // Wrap ORT's tensor memory in a Float32Array view, then copy
            // — once we ReleaseValue the underlying buffer is gone.
            const view = new Float32Array(ffi.toArrayBuffer(dataPtr, 0, total * 4));
            const data = new Float32Array(view);
            out.set(outputNames[i], { data, shape });
          } finally {
            a.ReleaseTensorTypeAndShapeInfo(tinfo);
          }
        } finally {
          a.ReleaseValue(valPtr);
        }
      }
      return out;
    } finally {
      // Release input OrtValues. (The Float32Arrays are still owned by
      // JS; we never copied them onto the device.)
      for (let i = 0; i < inputValues.length; i++) {
        if (inputValues[i] !== 0n) a.ReleaseValue(inputValues[i]);
      }
    }
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    const a = api!;
    if (this.#memInfo) {
      a.ReleaseMemoryInfo(this.#memInfo);
      this.#memInfo = 0n;
    }
    if (this.#session) {
      a.ReleaseSession(this.#session);
      this.#session = 0n;
    }
    if (this.#opts) {
      a.ReleaseSessionOptions(this.#opts);
      this.#opts = 0n;
    }
    if (this.#env) {
      a.ReleaseEnv(this.#env);
      this.#env = 0n;
    }
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

function isAvailable(): boolean {
  return probe();
}

function lastProbeError(): string | null {
  return probeError;
}

export default {
  Session,
  isAvailable,
  lastProbeError,
};
