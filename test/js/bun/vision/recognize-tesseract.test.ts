import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

// Tesseract OCR via libtesseract.so.5 FFI. The test environment must
// have libtesseract installed (apt install libtesseract-dev) AND a
// language traineddata file present. We discover both at runtime — if
// either is missing, the OCR-bearing tests skip with a noisy reason
// and the dispatch / error-path tests still run.
//
// `eng.traineddata` lookup order (matches Tesseract's own probe):
//   1. /tmp/tessdata           — convenient for CI dev hosts
//   2. /usr/share/tesseract-ocr/5/tessdata
//   3. /usr/share/tessdata
const TESSDATA_CANDIDATES = ["/tmp/tessdata", "/usr/share/tesseract-ocr/5/tessdata", "/usr/share/tessdata"];
function findTessdata(): string | null {
  for (const dir of TESSDATA_CANDIDATES) {
    if (existsSync(`${dir}/eng.traineddata`)) return dir;
  }
  return null;
}

const tessdataPath = findTessdata();

// 5×7 bitmap font fragment. Cheap synthetic OCR target — we can render
// known text deterministically and assert on what comes back. Real
// Tesseract is tuned for anti-aliased typography, so don't expect
// perfect glyph recovery on bitmap fonts; we test that *something*
// recognizable came out at the right location, not exact text equality.
const FONT: Record<string, string[]> = {
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

function renderText(text: string, scale = 12, padding = 20) {
  const charW = 5 * scale;
  const charH = 7 * scale;
  const gap = 2 * scale;
  const w = padding * 2 + text.length * charW + Math.max(0, text.length - 1) * gap;
  const h = padding * 2 + charH;

  const rgba = new Uint8Array(w * h * 4);
  rgba.fill(255); // white background, alpha included

  for (let li = 0; li < text.length; li++) {
    const rows = FONT[text[li]] ?? FONT[" "];
    const xOffset = padding + li * (charW + gap);
    for (let ry = 0; ry < 7; ry++) {
      for (let rx = 0; rx < 5; rx++) {
        if (rows[ry][rx] === "1") {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = xOffset + rx * scale + dx;
              const py = padding + ry * scale + dy;
              const i = (py * w + px) * 4;
              rgba[i] = 0;
              rgba[i + 1] = 0;
              rgba[i + 2] = 0;
            }
          }
        }
      }
    }
  }
  return { rgba, width: w, height: h, timestampMs: 0, sequence: 0 };
}

describe("parabun:vision.recognize — engine dispatch + error paths", () => {
  test("easyocr engine throws a helpful error (not yet wired)", async () => {
    const vision = (await import("parabun:vision")).default;
    const frame = renderText("HI", 6);
    await expect(vision.recognize(frame, { engine: "easyocr" })).rejects.toThrow(/easyocr engine is not wired yet/);
  });

  test("unknown engine throws", async () => {
    const vision = (await import("parabun:vision")).default;
    const frame = renderText("HI", 6);
    await expect(
      // @ts-expect-error — feeding an invalid engine on purpose
      vision.recognize(frame, { engine: "tesseract-x" }),
    ).rejects.toThrow(/unsupported engine/);
  });
});

describe.if(tessdataPath !== null)("parabun:vision.recognize — tesseract end-to-end", () => {
  test("recovers text from a synthesized bitmap-font frame", async () => {
    const vision = (await import("parabun:vision")).default;
    const frame = renderText("HELLO");
    const results = await vision.recognize(frame, {
      engine: "tesseract",
      language: "eng",
      datapath: tessdataPath!,
      minConfidence: 0.1,
    });
    // Tesseract's bitmap-font recognition is fuzzy — assert that
    // *something* came back, with structure intact.
    expect(results.length).toBeGreaterThan(0);
    for (const d of results) {
      expect(typeof d.label).toBe("string");
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.score).toBeGreaterThan(0);
      expect(d.score).toBeLessThanOrEqual(1);
      expect(d.bbox.width).toBeGreaterThan(0);
      expect(d.bbox.height).toBeGreaterThan(0);
    }
  });

  test("bbox lands inside the drawn region (synthesized frame)", async () => {
    const vision = (await import("parabun:vision")).default;
    const padding = 20;
    const frame = renderText("HELLO", 12, padding);
    const results = await vision.recognize(frame, {
      engine: "tesseract",
      language: "eng",
      datapath: tessdataPath!,
      minConfidence: 0.1,
    });
    expect(results.length).toBeGreaterThan(0);
    // First (and likely only) word's bbox should sit roughly inside
    // the padded region. A few-pixel slop is OK — Tesseract may include
    // anti-aliasing pixels around the glyphs.
    const r = results[0];
    expect(r.bbox.x).toBeGreaterThanOrEqual(padding - 4);
    expect(r.bbox.y).toBeGreaterThanOrEqual(padding - 4);
    expect(r.bbox.x + r.bbox.width).toBeLessThanOrEqual(frame.width - padding + 8);
    expect(r.bbox.y + r.bbox.height).toBeLessThanOrEqual(frame.height - padding + 8);
  });

  test("minConfidence drops weak detections", async () => {
    const vision = (await import("parabun:vision")).default;
    const frame = renderText("HI");
    const high = await vision.recognize(frame, {
      engine: "tesseract",
      language: "eng",
      datapath: tessdataPath!,
      minConfidence: 0.99,
    });
    const low = await vision.recognize(frame, {
      engine: "tesseract",
      language: "eng",
      datapath: tessdataPath!,
      minConfidence: 0.01,
    });
    // Strict cutoff produces no more results than the loose one.
    expect(high.length).toBeLessThanOrEqual(low.length);
  });

  test("missing language gives a useful error", async () => {
    const vision = (await import("parabun:vision")).default;
    const frame = renderText("HI", 4);
    await expect(
      vision.recognize(frame, {
        engine: "tesseract",
        language: "xyz", // no traineddata for "xyz"
        datapath: tessdataPath!,
      }),
    ).rejects.toThrow(/Init3 failed.*"xyz"/s);
  });

  test("blank frame returns an empty array (no false positives)", async () => {
    const vision = (await import("parabun:vision")).default;
    // 64×64 all-white: Tesseract should find no words.
    const rgba = new Uint8Array(64 * 64 * 4);
    rgba.fill(255);
    const frame = { rgba, width: 64, height: 64, timestampMs: 0, sequence: 0 };
    const results = await vision.recognize(frame, {
      engine: "tesseract",
      language: "eng",
      datapath: tessdataPath!,
    });
    expect(results).toEqual([]);
  });
});
