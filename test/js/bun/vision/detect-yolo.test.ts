import { describe, expect, test } from "bun:test";

// YOLO detection tests. The end-to-end ONNX path is exercised by
// onnx-session.test.ts (mnist-8); here we test the YOLO-specific
// pieces — letterbox, decode, NMS — that sit on top. Running a real
// YOLOv8n.onnx end-to-end is gated by a large model file most CI
// hosts don't have; we cover that path with synthetic-output decode +
// NMS unit tests instead, exposed via vision.yolo.

describe("parabun:vision.detect — engine dispatch + error paths", () => {
  test("ssd engine throws a helpful 'not wired' error", async () => {
    const vision = (await import("parabun:vision")).default;
    const frame = { rgba: new Uint8Array(64 * 64 * 4), width: 64, height: 64, timestampMs: 0, sequence: 0 };
    await expect(vision.detect(frame, { engine: "ssd", model: "/tmp/whatever.onnx" })).rejects.toThrow(
      /ssd engine is not wired yet/,
    );
  });

  test("rtdetr engine throws a helpful 'not wired' error", async () => {
    const vision = (await import("parabun:vision")).default;
    const frame = { rgba: new Uint8Array(64 * 64 * 4), width: 64, height: 64, timestampMs: 0, sequence: 0 };
    await expect(vision.detect(frame, { engine: "rtdetr", model: "/tmp/whatever.onnx" })).rejects.toThrow(
      /rtdetr engine is not wired yet/,
    );
  });

  test("unknown engine throws", async () => {
    const vision = (await import("parabun:vision")).default;
    const frame = { rgba: new Uint8Array(64 * 64 * 4), width: 64, height: 64, timestampMs: 0, sequence: 0 };
    await expect(
      // @ts-expect-error — feeding an invalid engine on purpose
      vision.detect(frame, { engine: "yolov999", model: "/tmp/x" }),
    ).rejects.toThrow(/unsupported engine/);
  });
});

describe("parabun:vision.yolo — letterbox", () => {
  test("preserves aspect on a wide source (100×50) into 640×640", async () => {
    const vision = (await import("parabun:vision")).default;
    const w = 100,
      h = 50;
    const rgba = new Uint8Array(w * h * 4);
    rgba.fill(200); // arbitrary uniform color (alpha=200 too is fine for letterbox)
    const lb = vision.yolo.letterbox(rgba, w, h, 640);
    // 640 / 100 = 6.4 → height becomes 50 * 6.4 = 320 → padY = 160 each side.
    expect(lb.tensor.length).toBe(3 * 640 * 640);
    expect(lb.scale).toBeCloseTo(6.4, 5);
    expect(lb.padX).toBe(0);
    expect(lb.padY).toBe(160);
  });

  test("preserves aspect on a tall source (50×100)", async () => {
    const vision = (await import("parabun:vision")).default;
    const w = 50,
      h = 100;
    const rgba = new Uint8Array(w * h * 4);
    rgba.fill(255);
    const lb = vision.yolo.letterbox(rgba, w, h, 640);
    expect(lb.scale).toBeCloseTo(6.4, 5);
    expect(lb.padX).toBe(160);
    expect(lb.padY).toBe(0);
  });

  test("center pixel preserves source color; corners hold gray pad (114/255)", async () => {
    const vision = (await import("parabun:vision")).default;
    const w = 100,
      h = 50;
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 200;
      rgba[i + 1] = 100;
      rgba[i + 2] = 50;
      rgba[i + 3] = 255;
    }
    const lb = vision.yolo.letterbox(rgba, w, h, 640);
    const planeStride = 640 * 640;
    // Center of letterbox: (320, 320). Resized source covers rows
    // 160..480 (h was 50 × scale 6.4 = 320, padded to fit 640).
    const idx = 320 * 640 + 320;
    expect(lb.tensor[idx] * 255).toBeCloseTo(200, 0);
    expect(lb.tensor[planeStride + idx] * 255).toBeCloseTo(100, 0);
    expect(lb.tensor[2 * planeStride + idx] * 255).toBeCloseTo(50, 0);
    // Top-left corner is in the gray-pad band (y=0 < padY=160).
    expect(lb.tensor[0] * 255).toBeCloseTo(114, 0);
  });
});

describe("parabun:vision.yolo — decode (synthetic output)", () => {
  test("picks the highest-scoring class per anchor", async () => {
    const vision = (await import("parabun:vision")).default;
    // Synthesize a 1-anchor output with 4+3 channels. Layout: [1, 7, 1].
    // Channel 0..3 = (cx, cy, w, h), Channel 4..6 = three class scores.
    // Class 1 has the highest score → that's what should come out.
    const out = new Float32Array([
      100, // cx
      120, // cy
      40, // w
      60, // h
      0.1, // class 0 score
      0.8, // class 1 score (winner)
      0.3, // class 2 score
    ]);
    const cands = vision.yolo.decode(out, [1, 7, 1], 0.25, ["a", "b", "c"]);
    expect(cands).toHaveLength(1);
    expect(cands[0].classId).toBe(1);
    expect(cands[0].score).toBeCloseTo(0.8);
    // (cx,cy,w,h) → (x1,y1,x2,y2) = (cx-w/2, cy-h/2, cx+w/2, cy+h/2)
    expect(cands[0].x1).toBeCloseTo(80);
    expect(cands[0].y1).toBeCloseTo(90);
    expect(cands[0].x2).toBeCloseTo(120);
    expect(cands[0].y2).toBeCloseTo(150);
  });

  test("filters anchors below scoreThreshold", async () => {
    const vision = (await import("parabun:vision")).default;
    // Two anchors, both classes < threshold → empty result.
    const out = new Float32Array([
      // Channel-major layout: 6 channels, 2 anchors each.
      10,
      200, // cx for anchor 0, 1
      10,
      200, // cy
      10,
      50, // w
      10,
      50, // h
      0.1,
      0.05, // class 0 scores
      0.2,
      0.15, // class 1 scores
    ]);
    const cands = vision.yolo.decode(out, [1, 6, 2], 0.5, ["a", "b"]);
    expect(cands).toHaveLength(0);
  });

  test("rejects mismatched class-list length with a useful error", async () => {
    const vision = (await import("parabun:vision")).default;
    const out = new Float32Array(7); // 4 + 3 channels, 1 anchor
    expect(() => vision.yolo.decode(out, [1, 7, 1], 0.25, ["only-one-class"])).toThrow(
      /3 classes; passed classes list has 1/,
    );
  });

  test("rejects unexpected output rank", async () => {
    const vision = (await import("parabun:vision")).default;
    const out = new Float32Array(7);
    expect(() => vision.yolo.decode(out, [7, 1], 0.25, ["a", "b", "c"])).toThrow(/unexpected output shape/);
  });
});

describe("parabun:vision.yolo — NMS", () => {
  test("drops overlapping boxes (same class) above iouThreshold", async () => {
    const vision = (await import("parabun:vision")).default;
    const boxes = [
      { x1: 10, y1: 10, x2: 100, y2: 100, score: 0.9, classId: 0 },
      { x1: 12, y1: 12, x2: 102, y2: 102, score: 0.7, classId: 0 }, // overlaps box 0
      { x1: 200, y1: 200, x2: 300, y2: 300, score: 0.6, classId: 0 }, // disjoint
    ];
    const kept = vision.yolo.nms(boxes, 0.5);
    expect(kept).toHaveLength(2);
    // Higher-score box stays first (sort by score desc), then the disjoint one.
    expect(kept[0].score).toBeCloseTo(0.9);
    expect(kept[1].score).toBeCloseTo(0.6);
  });

  test("does not suppress overlapping boxes of different classes", async () => {
    const vision = (await import("parabun:vision")).default;
    const boxes = [
      { x1: 10, y1: 10, x2: 100, y2: 100, score: 0.9, classId: 0 },
      { x1: 12, y1: 12, x2: 102, y2: 102, score: 0.7, classId: 1 }, // same area, diff class
    ];
    const kept = vision.yolo.nms(boxes, 0.5);
    expect(kept).toHaveLength(2);
  });

  test("retains all boxes when iouThreshold is 1 (no suppression)", async () => {
    const vision = (await import("parabun:vision")).default;
    const boxes = [
      { x1: 10, y1: 10, x2: 100, y2: 100, score: 0.9, classId: 0 },
      { x1: 10, y1: 10, x2: 100, y2: 100, score: 0.7, classId: 0 }, // identical
    ];
    const kept = vision.yolo.nms(boxes, 1.0);
    expect(kept).toHaveLength(2);
  });

  test("empty input returns empty", async () => {
    const vision = (await import("parabun:vision")).default;
    expect(vision.yolo.nms([], 0.5)).toEqual([]);
  });
});

describe("parabun:vision.yolo — COCO_CLASSES", () => {
  test("has 80 entries with the canonical first/last labels", async () => {
    const vision = (await import("parabun:vision")).default;
    expect(vision.yolo.COCO_CLASSES).toHaveLength(80);
    expect(vision.yolo.COCO_CLASSES[0]).toBe("person");
    expect(vision.yolo.COCO_CLASSES[79]).toBe("toothbrush");
  });
});
