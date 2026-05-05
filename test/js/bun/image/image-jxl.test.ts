import { describe, expect, test } from "bun:test";

// JPEG XL decode via libjxl. Skip-friendly when libjxl isn't
// loadable. No round-trip — libjxl's encoder API isn't wired
// (decode-only for v1; encode is a separate effort).

async function libjxlAvailable(): Promise<boolean> {
  try {
    const image = (await import("parabun:image")).default;
    // Probe via a magic-OK / body-bad JXL buffer.
    const fake = new Uint8Array([0xff, 0x0a, 0x00, 0x00]);
    try {
      image.decode(fake);
      return true;
    } catch (e: any) {
      return !String(e?.message ?? e).includes("libjxl at runtime");
    }
  } catch {
    return false;
  }
}

const SKIP = !(await libjxlAvailable());

describe.skipIf(SKIP)("parabun:image — JPEG XL magic detection + dispatch", () => {
  test("naked codestream magic (0xFF 0x0A) routes through libjxl", async () => {
    const image = (await import("parabun:image")).default;
    const fake = new Uint8Array([0xff, 0x0a, 0x00, 0x00, 0x00, 0x00]);
    let routedToJxl = false;
    try {
      image.decode(fake);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      // libjxl error or its install hint — both prove dispatch.
      // Native PNG/JPEG decoder errors are wholly different.
      if (/jxl|truncated|input/i.test(msg)) routedToJxl = true;
    }
    expect(routedToJxl).toBe(true);
  });

  test("ISOBMFF container magic routes through libjxl", async () => {
    const image = (await import("parabun:image")).default;
    // 0x00 0x00 0x00 0x0C 0x4A 0x58 0x4C 0x20 0x0D 0x0A 0x87 0x0A
    const fake = new Uint8Array([0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a, 0x00, 0x00]);
    let routedToJxl = false;
    try {
      image.decode(fake);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (/jxl|truncated|input/i.test(msg)) routedToJxl = true;
    }
    expect(routedToJxl).toBe(true);
  });

  test("non-JXL bytes skip the JXL path", async () => {
    const image = (await import("parabun:image")).default;
    // PNG magic (89 50 4E 47 …) — should NOT trigger jxl dispatch.
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    try {
      image.decode(png);
    } catch (e: any) {
      // Native PNG parse error is fine — we just verify the error
      // is NOT a libjxl install hint or jxl-flavoured error.
      const msg = String(e?.message ?? e);
      expect(msg).not.toMatch(/libjxl at runtime/i);
      expect(msg).not.toMatch(/JxlDecoder/);
    }
  });
});
