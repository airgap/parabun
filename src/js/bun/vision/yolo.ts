// Hardcoded module "parabun:vision/yolo" (private to parabun:vision)
//
// YOLOv8 detection — preprocessing + inference (via vision/onnx.ts) +
// decode + non-max suppression. Pure JS on top of the generic ONNX
// session; no model-specific code in vision.ts itself.
//
// Pipeline:
//   1. letterbox()  RGBA → resize-fit to 640×640, pad gray, normalize [0,1], CHW
//   2. session.run() input "images" → output "output0" of shape [1, 4+nc, n_anchors]
//                    (YOLOv8 default: nc=80, n_anchors=8400 across 3 scales)
//   3. decode()     pick max class per anchor, threshold, materialize candidates
//   4. nms()        greedy IoU pruning
//   5. unletterbox() bbox letterbox-space → source-frame pixel coords
//
// Session cache (LRU-1): vision.detect with the same model path on
// successive calls reuses the loaded session — model load is the
// dominant cost. Switching models disposes the prior session.

const onnxMod = require("./onnx.ts");

// COCO 80-class label set. Matches the order Ultralytics ships in
// `data/coco.yaml`; YOLOv8/YOLOv11 detection models trained on COCO emit
// scores at these indices. Override via DetectOptions.classes when
// running a custom-trained model.
const COCO_CLASSES = [
  "person",
  "bicycle",
  "car",
  "motorcycle",
  "airplane",
  "bus",
  "train",
  "truck",
  "boat",
  "traffic light",
  "fire hydrant",
  "stop sign",
  "parking meter",
  "bench",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
  "backpack",
  "umbrella",
  "handbag",
  "tie",
  "suitcase",
  "frisbee",
  "skis",
  "snowboard",
  "sports ball",
  "kite",
  "baseball bat",
  "baseball glove",
  "skateboard",
  "surfboard",
  "tennis racket",
  "bottle",
  "wine glass",
  "cup",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "banana",
  "apple",
  "sandwich",
  "orange",
  "broccoli",
  "carrot",
  "hot dog",
  "pizza",
  "donut",
  "cake",
  "chair",
  "couch",
  "potted plant",
  "bed",
  "dining table",
  "toilet",
  "tv",
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "cell phone",
  "microwave",
  "oven",
  "toaster",
  "sink",
  "refrigerator",
  "book",
  "clock",
  "vase",
  "scissors",
  "teddy bear",
  "hair drier",
  "toothbrush",
];

type RgbaFrame = {
  rgba: Uint8Array;
  width: number;
  height: number;
  timestampMs: number;
  sequence: number;
};

type Detection = {
  label: string;
  score: number;
  bbox: { x: number; y: number; width: number; height: number };
};

type DetectOpts = {
  /** Path to a YOLOv8/YOLOv11 ONNX model. */
  model: string;
  /** Drop detections below this confidence in [0, 1]. Default 0.25. */
  scoreThreshold?: number;
  /** IoU threshold for NMS in [0, 1]. Default 0.45. */
  iouThreshold?: number;
  /**
   * Override the class label list. Default: 80-class COCO. Length must
   * match the model's classifier output dimension (e.g. 80 for the
   * stock yolov8n.onnx).
   */
  classes?: string[];
  /**
   * Square input edge for letterbox. Default 640 (YOLOv8 default). Set
   * to 320 / 416 / 1280 for downsized / upsized model variants.
   */
  inputSize?: number;
};

// Session cache. LRU(1) — repeat calls with the same model path skip
// the dominant ONNX load cost. Switching models disposes the old
// session before loading the new one.
let cachedPath: string | null = null;
let cachedSession: any = null;

function sessionFor(modelPath: string): any {
  if (cachedPath === modelPath && cachedSession !== null) return cachedSession;
  if (cachedSession !== null) {
    try {
      cachedSession.dispose();
    } catch {}
    cachedSession = null;
    cachedPath = null;
  }
  cachedSession = new onnxMod.Session(modelPath);
  cachedPath = modelPath;
  return cachedSession;
}

function disposeYoloSession(): void {
  if (cachedSession !== null) {
    try {
      cachedSession.dispose();
    } catch {}
    cachedSession = null;
    cachedPath = null;
  }
}

// ─── Preprocess: letterbox + normalize + CHW ───────────────────────────
//
// YOLOv8 expects [1, 3, S, S] float32 in [0,1], RGB channel order, with
// a letterboxed resize: the source frame fits inside S×S preserving
// aspect, padded with gray (RGB 114/255 ≈ 0.447 — Ultralytics default).
//
// Returns the prepared tensor + the (scale, padX, padY) needed to undo
// the transform after detection.
function letterbox(
  rgba: Uint8Array,
  srcW: number,
  srcH: number,
  size: number,
): { tensor: Float32Array; scale: number; padX: number; padY: number } {
  const scale = Math.min(size / srcW, size / srcH);
  const newW = Math.round(srcW * scale);
  const newH = Math.round(srcH * scale);
  const padX = Math.floor((size - newW) / 2);
  const padY = Math.floor((size - newH) / 2);

  // CHW float32, [3, size, size]. Initialise to gray (Ultralytics default).
  const tensor = new Float32Array(3 * size * size);
  const PAD_VAL = 114 / 255;
  tensor.fill(PAD_VAL);

  // Bilinear-sample the source into the centered (newW × newH) region.
  // RGBA in (4 bytes / pixel), output channels split: R at offset 0,
  // G at size*size, B at 2*size*size.
  const planeStride = size * size;
  const stepX = srcW / newW;
  const stepY = srcH / newH;
  for (let dy = 0; dy < newH; dy++) {
    const sy = (dy + 0.5) * stepY - 0.5;
    const y0 = Math.max(0, Math.min(srcH - 1, Math.floor(sy)));
    const y1 = Math.max(0, Math.min(srcH - 1, y0 + 1));
    const yt = sy - y0;
    for (let dx = 0; dx < newW; dx++) {
      const sx = (dx + 0.5) * stepX - 0.5;
      const x0 = Math.max(0, Math.min(srcW - 1, Math.floor(sx)));
      const x1 = Math.max(0, Math.min(srcW - 1, x0 + 1));
      const xt = sx - x0;

      // 4 RGBA reads per output pixel, blended bilinearly per channel.
      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;
      const w00 = (1 - xt) * (1 - yt);
      const w10 = xt * (1 - yt);
      const w01 = (1 - xt) * yt;
      const w11 = xt * yt;
      const r = rgba[i00] * w00 + rgba[i10] * w10 + rgba[i01] * w01 + rgba[i11] * w11;
      const g = rgba[i00 + 1] * w00 + rgba[i10 + 1] * w10 + rgba[i01 + 1] * w01 + rgba[i11 + 1] * w11;
      const b = rgba[i00 + 2] * w00 + rgba[i10 + 2] * w10 + rgba[i01 + 2] * w01 + rgba[i11 + 2] * w11;

      const out = (dy + padY) * size + (dx + padX);
      tensor[out] = r / 255;
      tensor[planeStride + out] = g / 255;
      tensor[2 * planeStride + out] = b / 255;
    }
  }
  return { tensor, scale, padX, padY };
}

// ─── Decode YOLOv8 output ──────────────────────────────────────────────
//
// Output layout: [1, 4 + nClasses, nAnchors] in row-major order. Each
// channel is a contiguous block of nAnchors elements; channel 0..3 are
// (cx, cy, w, h) in input-space pixel coords; channels 4..3+nClasses
// are per-class scores (already sigmoid-activated by the export). For
// each anchor we pick the highest-scoring class and threshold.
function decode(
  output: Float32Array,
  outputShape: number[],
  scoreThreshold: number,
  classes: string[],
): { x1: number; y1: number; x2: number; y2: number; score: number; classId: number }[] {
  // Verify the shape we're working with — bail loudly on a mismatch
  // rather than reading garbage. YOLOv8 exports as [1, 4+nc, anchors];
  // some forks emit [1, anchors, 4+nc] (transposed) — not handled here.
  if (outputShape.length !== 3 || outputShape[0] !== 1) {
    throw new Error(
      `parabun:vision.detect: unexpected output shape [${outputShape.join(", ")}]; expected [1, 4+nClasses, nAnchors]`,
    );
  }
  const channels = outputShape[1];
  const nAnchors = outputShape[2];
  const nClasses = channels - 4;
  if (nClasses !== classes.length) {
    throw new Error(
      `parabun:vision.detect: model has ${nClasses} classes; ` +
        `passed classes list has ${classes.length}. Pass opts.classes for non-COCO models.`,
    );
  }

  const candidates: ReturnType<typeof decode> = [];
  for (let i = 0; i < nAnchors; i++) {
    // Find max class score for this anchor first — most anchors are
    // background. Skipping early on the threshold check cuts the
    // bbox-arithmetic and array-push for ~99% of anchors.
    let bestC = 0;
    let bestScore = output[4 * nAnchors + i];
    for (let c = 1; c < nClasses; c++) {
      const s = output[(4 + c) * nAnchors + i];
      if (s > bestScore) {
        bestScore = s;
        bestC = c;
      }
    }
    if (bestScore < scoreThreshold) continue;

    const cx = output[i];
    const cy = output[nAnchors + i];
    const w = output[2 * nAnchors + i];
    const h = output[3 * nAnchors + i];
    candidates.push({
      x1: cx - w / 2,
      y1: cy - h / 2,
      x2: cx + w / 2,
      y2: cy + h / 2,
      score: bestScore,
      classId: bestC,
    });
  }
  return candidates;
}

// ─── NMS (non-max suppression) ─────────────────────────────────────────
//
// Greedy: sort by score desc, walk down, drop any later box whose IoU
// with the current "kept" box exceeds the threshold. Same-class only
// (Ultralytics's default `agnostic=False`) — different classes can
// overlap freely.
function nms(
  cands: { x1: number; y1: number; x2: number; y2: number; score: number; classId: number }[],
  iouThreshold: number,
): typeof cands {
  cands.sort((a, b) => b.score - a.score);
  const kept: typeof cands = [];
  const dropped = new Uint8Array(cands.length);
  for (let i = 0; i < cands.length; i++) {
    if (dropped[i]) continue;
    const a = cands[i];
    kept.push(a);
    for (let j = i + 1; j < cands.length; j++) {
      if (dropped[j]) continue;
      const b = cands[j];
      if (b.classId !== a.classId) continue;
      // Compute IoU.
      const interX1 = Math.max(a.x1, b.x1);
      const interY1 = Math.max(a.y1, b.y1);
      const interX2 = Math.min(a.x2, b.x2);
      const interY2 = Math.min(a.y2, b.y2);
      const interW = Math.max(0, interX2 - interX1);
      const interH = Math.max(0, interY2 - interY1);
      const inter = interW * interH;
      if (inter === 0) continue;
      const aArea = (a.x2 - a.x1) * (a.y2 - a.y1);
      const bArea = (b.x2 - b.x1) * (b.y2 - b.y1);
      const iou = inter / (aArea + bArea - inter);
      if (iou > iouThreshold) dropped[j] = 1;
    }
  }
  return kept;
}

// ─── Detect: top-level entry point ─────────────────────────────────────
async function detect(frame: RgbaFrame, opts: DetectOpts): Promise<Detection[]> {
  const inputSize = opts.inputSize ?? 640;
  const scoreThreshold = opts.scoreThreshold ?? 0.25;
  const iouThreshold = opts.iouThreshold ?? 0.45;
  const classes = opts.classes ?? COCO_CLASSES;

  const session = sessionFor(opts.model);
  if (session.inputs.length !== 1 || session.outputs.length !== 1) {
    throw new Error(
      `parabun:vision.detect: expected 1 input + 1 output; got ${session.inputs.length} / ${session.outputs.length}`,
    );
  }
  const inputName = session.inputs[0].name;
  const outputName = session.outputs[0].name;

  // 1. Preprocess — letterbox + normalize + CHW.
  const { tensor, scale, padX, padY } = letterbox(frame.rgba, frame.width, frame.height, inputSize);

  // 2. Inference.
  const result = session.run({
    [inputName]: { data: tensor, shape: [1, 3, inputSize, inputSize] },
  });
  const out = result.get(outputName);
  if (!out) {
    throw new Error(`parabun:vision.detect: no output named "${outputName}" returned`);
  }

  // 3. Decode + 4. NMS.
  const cands = decode(out.data, out.shape, scoreThreshold, classes);
  const kept = nms(cands, iouThreshold);

  // 5. Map letterbox-space pixel coords back to source-frame pixels:
  //    src = (letterbox - pad) / scale, then clip to source bounds.
  const detections: Detection[] = [];
  for (const k of kept) {
    const sx1 = Math.max(0, Math.min(frame.width, (k.x1 - padX) / scale));
    const sy1 = Math.max(0, Math.min(frame.height, (k.y1 - padY) / scale));
    const sx2 = Math.max(0, Math.min(frame.width, (k.x2 - padX) / scale));
    const sy2 = Math.max(0, Math.min(frame.height, (k.y2 - padY) / scale));
    detections.push({
      label: classes[k.classId],
      score: k.score,
      bbox: {
        x: Math.round(sx1),
        y: Math.round(sy1),
        width: Math.round(sx2 - sx1),
        height: Math.round(sy2 - sy1),
      },
    });
  }
  return detections;
}

export default {
  detect,
  disposeYoloSession,
  COCO_CLASSES,
  // Lower-level escape hatches for users with custom heads or non-YOLO
  // models. All pure JS / typed-array math; no ONNX coupling.
  letterbox,
  decode,
  nms,
};
