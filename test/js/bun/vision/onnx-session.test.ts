import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

// ONNX Runtime via libonnxruntime.so FFI. The test environment needs
// (1) libonnxruntime installed and (2) an .onnx model to load against.
// Both are auto-discovered: probe libonnxruntime on the standard search
// path (PARABUN_ONNX_LIB env override is honored), and look for
// /tmp/mnist-8.onnx as a tiny pinned test model. Tests skip with a
// helpful reason when either is missing — CI hosts without ORT pass.
//
// Install hints (for dev):
//   brew install onnxruntime                                       # macOS
//   apt install libonnxruntime-dev                                 # some Linux variants
//   curl -L https://github.com/microsoft/onnxruntime/releases/.../onnxruntime-linux-x64-1.16.3.tgz
//   curl -L https://github.com/onnx/models/raw/main/validated/vision/classification/mnist/model/mnist-8.onnx \
//     -o /tmp/mnist-8.onnx

const MODEL_PATH = "/tmp/mnist-8.onnx";
const haveModel = existsSync(MODEL_PATH);

let haveOrt = false;
try {
  const vision = (await import("parabun:vision")).default;
  haveOrt = vision.onnxIsAvailable();
} catch {
  haveOrt = false;
}

describe("parabun:vision.onnx — session lifecycle (ORT FFI)", () => {
  test("onnxIsAvailable() reports a boolean", async () => {
    const vision = (await import("parabun:vision")).default;
    expect(typeof vision.onnxIsAvailable()).toBe("boolean");
  });

  test("creating a session with a missing file throws (when ORT is available)", async () => {
    const vision = (await import("parabun:vision")).default;
    if (!haveOrt) return; // skip — no ORT to throw against
    expect(() => vision.onnx("/tmp/__definitely_does_not_exist__.onnx")).toThrow(/CreateSession failed/);
  });

  test("creating a session without ORT throws an install-hinting error", async () => {
    const vision = (await import("parabun:vision")).default;
    if (haveOrt) return; // skip — ORT *is* available so this path won't fire
    expect(() => vision.onnx("/tmp/nothing")).toThrow(/libonnxruntime not loadable/);
  });
});

describe.if(haveOrt && haveModel)("parabun:vision.onnx — mnist-8 end-to-end", () => {
  test("session enumerates one input + one output", async () => {
    const vision = (await import("parabun:vision")).default;
    const sess = vision.onnx(MODEL_PATH);
    try {
      expect(sess.inputs).toHaveLength(1);
      expect(sess.outputs).toHaveLength(1);
      expect(typeof sess.inputs[0].name).toBe("string");
      expect(typeof sess.outputs[0].name).toBe("string");
      // mnist-8 names — pinned by the model, not by our code.
      expect(sess.inputs[0].name).toBe("Input3");
      expect(sess.outputs[0].name).toBe("Plus214_Output_0");
    } finally {
      sess.dispose();
    }
  });

  test("classifies a synthetic '1' shape as digit 1", async () => {
    const vision = (await import("parabun:vision")).default;
    const sess = vision.onnx(MODEL_PATH);
    try {
      // 28×28 grayscale: a vertical line down the center, width 2px.
      const data = new Float32Array(1 * 1 * 28 * 28);
      for (let y = 0; y < 28; y++) for (let x = 13; x <= 14; x++) data[y * 28 + x] = 1;
      const out = sess.run({ [sess.inputs[0].name]: { data, shape: [1, 1, 28, 28] } });
      const r = out.get(sess.outputs[0].name)!;
      expect(r.shape).toEqual([1, 10]);
      expect(r.data).toBeInstanceOf(Float32Array);
      expect(r.data.length).toBe(10);
      // argmax must be the digit "1".
      let argmax = 0;
      for (let i = 1; i < r.data.length; i++) if (r.data[i] > r.data[argmax]) argmax = i;
      expect(argmax).toBe(1);
    } finally {
      sess.dispose();
    }
  });

  test("classifies a synthetic '0' shape (ring) as digit 0", async () => {
    const vision = (await import("parabun:vision")).default;
    const sess = vision.onnx(MODEL_PATH);
    try {
      // 28×28 grayscale: an oval ring (top + bottom + left + right edges
      // of an inset rectangle). MNIST-8 isn't rotation-invariant but
      // recognises ring-like topologies as 0 reliably.
      const data = new Float32Array(28 * 28);
      const top = 5,
        bot = 22,
        lft = 10,
        rgt = 17;
      for (let x = lft; x <= rgt; x++) {
        data[top * 28 + x] = 1;
        data[bot * 28 + x] = 1;
      }
      for (let y = top; y <= bot; y++) {
        data[y * 28 + lft] = 1;
        data[y * 28 + rgt] = 1;
      }
      const out = sess.run({ [sess.inputs[0].name]: { data, shape: [1, 1, 28, 28] } });
      const r = out.get(sess.outputs[0].name)!;
      let argmax = 0;
      for (let i = 1; i < r.data.length; i++) if (r.data[i] > r.data[argmax]) argmax = i;
      expect(argmax).toBe(0);
    } finally {
      sess.dispose();
    }
  });

  test("dispose() is idempotent; subsequent run() throws", async () => {
    const vision = (await import("parabun:vision")).default;
    const sess = vision.onnx(MODEL_PATH);
    sess.dispose();
    sess.dispose(); // second call must not throw
    const data = new Float32Array(28 * 28);
    expect(() => sess.run({ [sess.inputs[0].name]: { data, shape: [1, 1, 28, 28] } })).toThrow(/session is disposed/);
  });

  test("multiple sessions over the same lib don't interfere", async () => {
    const vision = (await import("parabun:vision")).default;
    const a = vision.onnx(MODEL_PATH);
    const b = vision.onnx(MODEL_PATH);
    try {
      // Run on `a` then `b` — outputs should match for identical inputs
      // (MNIST-8 is deterministic, no dropout in inference).
      const data = new Float32Array(28 * 28);
      for (let y = 0; y < 28; y++) for (let x = 13; x <= 14; x++) data[y * 28 + x] = 1;
      const ra = a.run({ [a.inputs[0].name]: { data, shape: [1, 1, 28, 28] } }).get(a.outputs[0].name)!;
      const rb = b.run({ [b.inputs[0].name]: { data, shape: [1, 1, 28, 28] } }).get(b.outputs[0].name)!;
      expect(ra.shape).toEqual(rb.shape);
      let maxErr = 0;
      for (let i = 0; i < ra.data.length; i++) maxErr = Math.max(maxErr, Math.abs(ra.data[i] - rb.data[i]));
      // Bit-exact match expected — same model, same input.
      expect(maxErr).toBe(0);
    } finally {
      a.dispose();
      b.dispose();
    }
  });

  test("[Symbol.dispose] is wired (using session = vision.onnx(...))", async () => {
    const vision = (await import("parabun:vision")).default;
    {
      using sess = vision.onnx(MODEL_PATH);
      expect(sess.inputs.length).toBeGreaterThan(0);
    }
    // No assertion on internals; the test passes if the using block
    // doesn't leak (no throw, no crash on session destructor).
  });
});
