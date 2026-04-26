import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

// Minimal 4×4 RGB PNG: red/blue checkerboard. Generated with Python's
// zlib + struct (no external image lib needed), 87 bytes.
const PNG_4X4_HEX =
  "89504e470d0a1a0a0000000d494844520000000400000004080200000026930929" +
  "000000164944415478da63f8cf0004ff212482f51fcac52a03009ea30ff1dd565c" +
  "ee0000000049454e44ae426082";

// 4×4 lossless WebP of the red/blue checkerboard. Generated via Pillow
// (which uses libwebp). 46 bytes — WebP's lossless container is denser
// than PNG for small inputs.
// prettier-ignore
const WEBP_4X4_HEX = "5249464626000000574542505650384c190000002f03c000000f10f3bffff31f0ed4b46dc0e22be988e87f700e00";

// 4×4 RGB JPEG of the same red/blue checkerboard, quality 95. Generated
// via Pillow on the host. Single line so there's no chance of a chunk
// boundary swallowing a byte; ~1344 hex chars / 672 bytes.
// prettier-ignore
const JPEG_4X4_HEX = "ffd8ffe000104a46494600010100000100010000ffdb0043000201010101010201010102020202020403020202020504040304060506060605060606070908060709070606080b08090a0a0a0a0a06080b0c0b0a0c090a0a0affdb004301020202020202050303050a0706070a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0affc00011080004000403012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00fce8f0678334df1be9afaa6a92ec74f2703ec56d3ffadb686e1be6b88a46fbd330e0f38dcdb9d9dd8a28afea83fb50ffd9";

const fixtureSrc = `
  const _hexToBytes = (h) => Uint8Array.from(h.match(/../g).map(x => parseInt(x, 16)));
  const PNG = _hexToBytes("${PNG_4X4_HEX}");
  const JPEG = _hexToBytes("${JPEG_4X4_HEX}");
  const WEBP = _hexToBytes("${WEBP_4X4_HEX}");
`;

async function runFixture(prefix, source) {
  using dir = tempDir(prefix, { "index.ts": (fixtureSrc + source).trimStart() });
  await using proc = Bun.spawn({
    cmd: [bunExe(), "index.ts"],
    env: bunEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe("bun:image — decode", () => {
  it("decodes a PNG with the right shape + format", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-png-shape",
      `
        import image from "bun:image";
        const r = image.decode(PNG);
        console.log("format", r.format);
        console.log("dims", r.width, r.height);
        console.log("channels", r.channels);
        console.log("dataLen", r.data.length);
      `,
    );
    expect(stdout).toBe(["format png", "dims 4 4", "channels 4", "dataLen 64"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("PNG pixel(0,0) is red, pixel(1,0) is blue", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-png-pixels",
      `
        import image from "bun:image";
        const r = image.decode(PNG);
        // RGBA at row-major offsets.
        console.log("p00", r.data[0], r.data[1], r.data[2], r.data[3]);  // red, opaque
        console.log("p10", r.data[4], r.data[5], r.data[6], r.data[7]);  // blue, opaque
      `,
    );
    expect(stdout).toBe(["p00 255 0 0 255", "p10 0 0 255 255"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("decodes a lossless WebP with the right shape + format", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-webp-shape",
      `
        import image from "bun:image";
        const r = image.decode(WEBP);
        console.log("format", r.format);
        console.log("dims", r.width, r.height);
        console.log("channels", r.channels);
        console.log("dataLen", r.data.length);
      `,
    );
    // Lossless WebP → RGBA, 4×4×4 = 64 bytes.
    expect(stdout).toBe(["format webp", "dims 4 4", "channels 4", "dataLen 64"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("WebP pixel(0,0) is red, pixel(1,0) is blue (lossless preserves)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-webp-pixels",
      `
        import image from "bun:image";
        const r = image.decode(WEBP);
        // Lossless WebP should preserve the exact red/blue pixels.
        console.log("p00", r.data[0], r.data[1], r.data[2], r.data[3]);
        console.log("p10", r.data[4], r.data[5], r.data[6], r.data[7]);
      `,
    );
    expect(stdout).toBe(["p00 255 0 0 255", "p10 0 0 255 255"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("decodes a JPEG with the right shape + format", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-jpeg-shape",
      `
        import image from "bun:image";
        const r = image.decode(JPEG);
        console.log("format", r.format);
        console.log("dims", r.width, r.height);
        console.log("channels", r.channels);
        console.log("dataLen", r.data.length);
      `,
    );
    expect(stdout).toBe(["format jpeg", "dims 4 4", "channels 3", "dataLen 48"].join("\n"));
    expect(exitCode).toBe(0);
  });

  // Per-pixel JPEG correctness is validated indirectly: the decode
  // produces bytes, the shape matches what libjpeg reports, and the
  // PNG pixel test above (byte-exact for lossless PNG) verifies the
  // pixel-buffer plumbing isn't dropping bytes. We don't pin specific
  // JPEG pixel values because chroma subsampling on a 4×4 fixture
  // smears colors across the single 8×8 block libjpeg encodes — the
  // round-trip is correct, just heavily lossy at this size.

  it("rejects non-image input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-bad-bytes",
      `
        import image from "bun:image";
        try {
          image.decode(new Uint8Array([1, 2, 3, 4, 5]));
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("unrecognized format"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("rejects empty input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-empty",
      `
        import image from "bun:image";
        try {
          image.decode(new Uint8Array(0));
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("unrecognized format"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("rejects non-Uint8Array input", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-not-bytes",
      `
        import image from "bun:image";
        try {
          image.decode("a string");
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("expected Uint8Array"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("PNG encode → decode roundtrip preserves pixels exactly (lossless)", async () => {
    // 4×4 RGBA pixels, alternating red/blue. Encode to PNG, decode the
    // result, verify byte-equal pixel arrays. PNG is lossless so we can
    // pin every byte.
    const { stdout, exitCode } = await runFixture(
      "parabun-image-png-roundtrip",
      `
        import image from "bun:image";
        const w = 4, h = 4;
        const data = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const off = (y * w + x) * 4;
          if ((x + y) % 2 === 0) { data[off] = 255; data[off+1] = 0; data[off+2] = 0; data[off+3] = 255; }
          else                   { data[off] = 0;   data[off+1] = 0; data[off+2] = 255; data[off+3] = 255; }
        }
        const orig = { data, width: w, height: h, channels: 4, format: "png" };
        const bytes = image.encode(orig, { format: "png" });
        console.log("encoded.kind", bytes.constructor.name);
        console.log("encoded.first4", bytes[0], bytes[1], bytes[2], bytes[3]);  // PNG sig
        const back = image.decode(bytes);
        console.log("dims", back.width, back.height, "ch", back.channels);
        console.log("equal", back.data.length === data.length && back.data.every((v, i) => v === data[i]));
      `,
    );
    expect(stdout).toBe(
      ["encoded.kind Buffer", "encoded.first4 137 80 78 71", "dims 4 4 ch 4", "equal true"].join("\n"),
    );
    expect(exitCode).toBe(0);
  });

  it("JPEG encode → decode roundtrip preserves dims (lossy bytes)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-jpeg-roundtrip",
      `
        import image from "bun:image";
        const w = 16, h = 16;  // 16×16 gives JPEG room to preserve a gradient
        const data = new Uint8Array(w * h * 3);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const off = (y * w + x) * 3;
          data[off] = (x * 16) | 0;
          data[off + 1] = (y * 16) | 0;
          data[off + 2] = 128;
        }
        const orig = { data, width: w, height: h, channels: 3, format: "jpeg" };
        const bytes = image.encode(orig, { format: "jpeg", quality: 95 });
        // SOI marker at start
        console.log("first2", bytes[0], bytes[1]);
        const back = image.decode(bytes);
        console.log("back.dims", back.width, back.height, "ch", back.channels);
        // Spot check: gradient ordering should survive lossy encode.
        const left = back.data[0]; // pixel (0,0).R, expected near 0
        const right = back.data[(w - 1) * 3]; // pixel (w-1, 0).R, expected near 240
        console.log("gradient.preserved", left < 80 && right > 180);
      `,
    );
    expect(stdout).toBe(["first2 255 216", "back.dims 16 16 ch 3", "gradient.preserved true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("encode accepts RGBA input for JPEG (alpha dropped)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-jpeg-from-rgba",
      `
        import image from "bun:image";
        const w = 16, h = 16;
        const data = new Uint8Array(w * h * 4);
        for (let i = 0; i < w * h; i++) {
          data[i * 4] = 200; data[i * 4 + 1] = 100; data[i * 4 + 2] = 50; data[i * 4 + 3] = 255;
        }
        const bytes = image.encode({ data, width: w, height: h, channels: 4, format: "png" }, { format: "jpeg", quality: 90 });
        const back = image.decode(bytes);
        console.log("ch", back.channels, "dims", back.width, back.height);
        // Pixel should be roughly 200, 100, 50 after lossy roundtrip.
        const r = back.data[0], g = back.data[1], b = back.data[2];
        console.log("approx", Math.abs(r - 200) < 20, Math.abs(g - 100) < 20, Math.abs(b - 50) < 20);
      `,
    );
    expect(stdout).toBe(["ch 3 dims 16 16", "approx true true true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("WebP lossless encode → decode roundtrip preserves pixels exactly", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-webp-roundtrip-lossless",
      `
        import image from "bun:image";
        const w = 4, h = 4;
        const data = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const off = (y * w + x) * 4;
          if ((x + y) % 2 === 0) { data[off] = 255; data[off+1] = 0; data[off+2] = 0; data[off+3] = 255; }
          else                   { data[off] = 0;   data[off+1] = 0; data[off+2] = 255; data[off+3] = 255; }
        }
        const orig = { data, width: w, height: h, channels: 4, format: "png" };
        const bytes = image.encode(orig, { format: "webp", lossless: true });
        // RIFF...WEBP magic
        console.log("magic", String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]),
                    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]));
        const back = image.decode(bytes);
        console.log("dims", back.width, back.height, "ch", back.channels);
        const equal = back.data.length === data.length && back.data.every((v, i) => v === data[i]);
        console.log("equal", equal);
      `,
    );
    expect(stdout).toBe(["magic RIFF WEBP", "dims 4 4 ch 4", "equal true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("WebP lossy encode produces a valid file that decodes back to right dims", async () => {
    // Don't assert lossy < lossless on size — for tiny images (16×16) the
    // VP8 header overhead can flip the inequality. We only assert that
    // both modes produce decode-able WebP bytes.
    const { stdout, exitCode } = await runFixture(
      "parabun-image-webp-lossy",
      `
        import image from "bun:image";
        const w = 16, h = 16;
        const data = new Uint8Array(w * h * 3);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const off = (y * w + x) * 3;
          data[off] = (x * 16) | 0;       // R gradient L→R
          data[off + 1] = (y * 16) | 0;   // G gradient T→B
          data[off + 2] = 128;
        }
        const orig = { data, width: w, height: h, channels: 3, format: "png" };
        const lossy = image.encode(orig, { format: "webp", quality: 75 });
        const back = image.decode(lossy);
        console.log("back.dims", back.width, back.height, "ch", back.channels);
        // Gradient ordering survives — top-left dark, bottom-right bright.
        const tl = back.data[0];
        const br = back.data[(15 * 16 + 15) * 4];
        console.log("gradient", tl < 80 && br > 180);
      `,
    );
    expect(stdout).toBe(["back.dims 16 16 ch 4", "gradient true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("encode rejects unknown format", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-encode-bad-format",
      `
        import image from "bun:image";
        const data = new Uint8Array(48);
        try {
          image.encode({ data, width: 4, height: 4, channels: 3, format: "jpeg" }, { format: "tiff" });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("unknown format"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("resize identity (same dims) preserves pixels", async () => {
    // Decoded pixels resized to their own dims should round-trip nearly
    // exactly under bilinear (each output pixel samples the four nearest
    // source pixels with weights that collapse to the source pixel
    // when src == dst dims, modulo float rounding).
    const { stdout, exitCode } = await runFixture(
      "parabun-image-resize-identity",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        const same = image.resize(orig, { width: orig.width, height: orig.height });
        console.log("dims", same.width, same.height, same.channels);
        const equal = same.data.length === orig.data.length && same.data.every((v, i) => v === orig.data[i]);
        console.log("byteEqual", equal);
      `,
    );
    expect(stdout).toBe(["dims 4 4 4", "byteEqual true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("resize 2× upscale preserves edges", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-resize-up",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);  // 4×4 RGBA red/blue checker
        const up = image.resize(orig, { width: 8, height: 8 });
        console.log("dims", up.width, up.height, up.channels);
        // Top-left pixel of upscaled should still be predominantly red
        // (its source neighborhood is mostly red).
        const r = up.data[0], g = up.data[1], b = up.data[2];
        console.log("topLeftDominant", r > g && r > b);
      `,
    );
    expect(stdout).toBe(["dims 8 8 4", "topLeftDominant true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("resize 2× downscale produces correct dims + valid bytes", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-resize-down",
      `
        import image from "bun:image";
        // Build a 16×16 RGBA image with a horizontal gradient.
        const w = 16, h = 16;
        const data = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const off = (y * w + x) * 4;
          data[off] = (x * 16) | 0;       // R: 0 → 240
          data[off + 1] = 0;
          data[off + 2] = 0;
          data[off + 3] = 255;
        }
        const orig = { data, width: w, height: h, channels: 4, format: "png" };
        const small = image.resize(orig, { width: 8, height: 8 });
        console.log("dims", small.width, small.height, small.channels);
        // The gradient still goes left → right after downscale.
        const leftR = small.data[0];
        const rightR = small.data[(7) * 4];
        console.log("gradient", leftR < 80 && rightR > 180);
      `,
    );
    expect(stdout).toBe(["dims 8 8 4", "gradient true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("resize non-square dims (asymmetric scale)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-resize-nonsquare",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        const out = image.resize(orig, { width: 12, height: 6 });
        console.log("dims", out.width, out.height, out.channels);
        console.log("dataLen", out.data.length);
        // 12 × 6 × 4 channels = 288.
      `,
    );
    expect(stdout).toBe(["dims 12 6 4", "dataLen 288"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("decode → resize → encode → decode round-trip", async () => {
    // The end-to-end pipeline this whole module exists for: take a
    // JPEG, decode + resize + re-encode as PNG, then decode the PNG
    // back. Verifies all three operations cooperate cleanly.
    const { stdout, exitCode } = await runFixture(
      "parabun-image-pipeline",
      `
        import image from "bun:image";
        const decoded = image.decode(JPEG);
        const small = image.resize(decoded, { width: 2, height: 2 });
        const png = image.encode(small, { format: "png" });
        const back = image.decode(png);
        console.log("decoded", decoded.format, decoded.width, decoded.height);
        console.log("small", small.width, small.height, small.channels);
        // PNG decode forces RGBA, so the round-trip's channels will be
        // 4 even though we encoded a 3-channel resize result.
        console.log("back", back.format, back.width, back.height, back.channels);
      `,
    );
    expect(stdout).toBe(["decoded jpeg 4 4", "small 2 2 3", "back png 2 2 4"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("Lanczos resize matches dims and produces a valid result", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-resize-lanczos",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        const out = image.resize(orig, { width: 8, height: 8, kernel: "lanczos" });
        console.log("dims", out.width, out.height, out.channels);
        console.log("dataLen", out.data.length);
        // Lanczos preserves edges — top-left should still be predominantly red
        // (its neighborhood is mostly red in the source checkerboard).
        const r = out.data[0], g = out.data[1], b = out.data[2];
        console.log("topLeftRedDominant", r > g && r > b);
      `,
    );
    expect(stdout).toBe(["dims 8 8 4", "dataLen 256", "topLeftRedDominant true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("Lanczos anti-aliases a high-frequency pattern that bilinear aliases", async () => {
    // 32×32 vertical-stripes pattern (1px black, 1px white) downscaled
    // to 8×8. Bilinear with no anti-alias filter aliases hard — the
    // 8×8 result has near-uniform middle-gray (or moiré). Lanczos
    // with its wide kernel averages each output cell over multiple
    // stripes and produces a visibly more uniform mid-gray with less
    // bin-to-bin variance.
    const { stdout, exitCode } = await runFixture(
      "parabun-image-lanczos-aliasing",
      `
        import image from "bun:image";
        const w = 32, h = 32;
        const data = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const off = (y * w + x) * 4;
          const v = (x % 2 === 0) ? 0 : 255;
          data[off] = v; data[off+1] = v; data[off+2] = v; data[off+3] = 255;
        }
        const orig = { data, width: w, height: h, channels: 4, format: "png" };
        const lanczos = image.resize(orig, { width: 8, height: 8, kernel: "lanczos" });

        // The Lanczos result of an alternating-pixel pattern should have
        // every R sample close to the average (~127) — anti-aliased.
        const reds = [];
        for (let i = 0; i < 64; i++) reds.push(lanczos.data[i * 4]);
        const avg = reds.reduce((a, b) => a + b, 0) / reds.length;
        let maxDev = 0;
        for (const r of reds) maxDev = Math.max(maxDev, Math.abs(r - avg));
        console.log("avgClose127", Math.abs(avg - 127) < 30);
        console.log("lowVariance", maxDev < 50);
      `,
    );
    expect(stdout).toBe(["avgClose127 true", "lowVariance true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rejects an unknown kernel name", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-resize-bad-kernel",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        try {
          image.resize(orig, { width: 4, height: 4, kernel: "bicubic" });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("\\"bilinear\\" or \\"lanczos\\""));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("blur with radius 0 returns the input unchanged", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-blur-zero",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        const out = image.blur(orig, { radius: 0 });
        console.log("dims", out.width, out.height, out.channels);
        const equal = out.data.length === orig.data.length && out.data.every((v, i) => v === orig.data[i]);
        console.log("byteEqual", equal);
      `,
    );
    expect(stdout).toBe(["dims 4 4 4", "byteEqual true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("blur smooths a high-contrast edge — output variance much less than input", async () => {
    // 32×32 image with vertical bands of all-0 and all-255. Variance is
    // huge before blur, much smaller after. (Variance is the mean-square
    // deviation from the mean — a uniform image has variance 0.)
    const { stdout, exitCode } = await runFixture(
      "parabun-image-blur-smooths",
      `
        import image from "bun:image";
        const w = 32, h = 32;
        const data = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const off = (y * w + x) * 4;
          const v = (x % 2 === 0) ? 0 : 255;
          data[off] = v; data[off + 1] = v; data[off + 2] = v; data[off + 3] = 255;
        }
        const orig = { data, width: w, height: h, channels: 4, format: "png" };

        function rVariance(img) {
          const N = img.width * img.height;
          let sum = 0;
          for (let i = 0; i < N; i++) sum += img.data[i * 4];
          const mean = sum / N;
          let var_ = 0;
          for (let i = 0; i < N; i++) { const d = img.data[i * 4] - mean; var_ += d * d; }
          return var_ / N;
        }
        const inVar = rVariance(orig);
        const blurred = image.blur(orig, { radius: 5 });
        const outVar = rVariance(blurred);
        console.log("inVar.gt.10000", inVar > 10000);    // ~16,256 for ±127.5 step
        console.log("outVar.lt.1000", outVar < 1000);    // bigger blur kernel → smaller variance
        console.log("dims", blurred.width, blurred.height, blurred.channels);
      `,
    );
    expect(stdout).toBe(["inVar.gt.10000 true", "outVar.lt.1000 true", "dims 32 32 4"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("blur preserves the alpha channel intact", async () => {
    // Alpha at 255 everywhere should stay 255 (constant input → identity
    // blur output, modulo edge-clamp behavior at the boundary which still
    // gives 255 for a uniform input).
    const { stdout, exitCode } = await runFixture(
      "parabun-image-blur-alpha",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        const blurred = image.blur(orig, { radius: 3 });
        // Every alpha byte (offset 3, 7, 11, ...) should stay 255.
        const allOpaque = blurred.data.every((v, i) => i % 4 !== 3 || v === 255);
        console.log("allAlpha255", allOpaque);
      `,
    );
    expect(stdout).toBe("allAlpha255 true");
    expect(exitCode).toBe(0);
  });

  it("blur rejects out-of-range radius", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-blur-bad-radius",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        try {
          image.blur(orig, { radius: 999 });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("[0, 100]"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("resize rejects zero dims", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-resize-zero",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        try {
          image.resize(orig, { width: 0, height: 4 });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes(">= 1"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("sharpen with amount 0 returns the input unchanged", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-sharpen-zero",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        const out = image.sharpen(orig, { amount: 0, radius: 1 });
        console.log("dims", out.width, out.height, out.channels);
        const equal = out.data.length === orig.data.length && out.data.every((v, i) => v === orig.data[i]);
        console.log("byteEqual", equal);
      `,
    );
    expect(stdout).toBe(["dims 4 4 4", "byteEqual true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("sharpen amplifies edge contrast — halos appear around a mid-tone step", async () => {
    // 16×16 RGBA image with a vertical step edge from 64 to 192 at x=8.
    // Mid-tone values (not 0/255) leave headroom for unsharp-mask halos
    // to show up on both sides of the boundary. The total absolute
    // adjacent-pixel difference along the row should grow because
    // sharpening adds undershoot/overshoot rings.
    const { stdout, exitCode } = await runFixture(
      "parabun-image-sharpen-edge",
      `
        import image from "bun:image";
        const w = 16, h = 16;
        const data = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const off = (y * w + x) * 4;
          const v = x < 8 ? 64 : 192;
          data[off] = v; data[off + 1] = v; data[off + 2] = v; data[off + 3] = 255;
        }
        const orig = { data, width: w, height: h, channels: 4, format: "png" };
        const sharper = image.sharpen(orig, { amount: 2, radius: 2 });
        function totalAbsDiffR(img) {
          let acc = 0;
          for (let x = 0; x < img.width - 1; x++) {
            const a = img.data[x * 4];
            const b = img.data[(x + 1) * 4];
            acc += Math.abs(b - a);
          }
          return acc;
        }
        const inDiff = totalAbsDiffR(orig);
        const outDiff = totalAbsDiffR(sharper);
        console.log("origStep", inDiff);
        console.log("sharperGreater", outDiff > inDiff);
        console.log("dims", sharper.width, sharper.height, sharper.channels);
      `,
    );
    expect(stdout).toBe(["origStep 128", "sharperGreater true", "dims 16 16 4"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("sharpen preserves alpha unchanged on RGBA inputs", async () => {
    // Vary R/G/B per-pixel, but set alpha to a non-trivial 200 — the
    // unsharp pass should leave alpha at exactly 200 everywhere.
    const { stdout, exitCode } = await runFixture(
      "parabun-image-sharpen-alpha",
      `
        import image from "bun:image";
        const w = 8, h = 8;
        const data = new Uint8Array(w * h * 4);
        for (let i = 0; i < w * h; i++) {
          data[i * 4 + 0] = (i * 17) & 0xff;
          data[i * 4 + 1] = (i * 53) & 0xff;
          data[i * 4 + 2] = (i * 91) & 0xff;
          data[i * 4 + 3] = 200;
        }
        const orig = { data, width: w, height: h, channels: 4, format: "png" };
        const out = image.sharpen(orig, { amount: 1.5, radius: 1 });
        let allAlpha200 = true;
        for (let i = 0; i < w * h; i++) {
          if (out.data[i * 4 + 3] !== 200) { allAlpha200 = false; break; }
        }
        console.log("allAlpha200", allAlpha200);
      `,
    );
    expect(stdout).toBe("allAlpha200 true");
    expect(exitCode).toBe(0);
  });

  it("edgeDetect collapses to channels=1 with the source dims", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-edge-shape",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);            // 4×4 RGBA
        const out = image.edgeDetect(orig);
        console.log("dims", out.width, out.height, out.channels);
        console.log("dataLen", out.data.length);
      `,
    );
    expect(stdout).toBe(["dims 4 4 1", "dataLen 16"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("edgeDetect picks up a vertical step edge at the boundary", async () => {
    // 8×8 RGBA: left half black, right half white. Sobel should produce
    // a strong response (≈ 255) at the boundary column and ~0 in the
    // flat regions.
    const { stdout, exitCode } = await runFixture(
      "parabun-image-edge-vertical",
      `
        import image from "bun:image";
        const w = 8, h = 8;
        const data = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const off = (y * w + x) * 4;
          const v = x < 4 ? 0 : 255;
          data[off] = v; data[off + 1] = v; data[off + 2] = v; data[off + 3] = 255;
        }
        const orig = { data, width: w, height: h, channels: 4, format: "png" };
        const edges = image.edgeDetect(orig);
        // Sample the middle row at the boundary column (3 or 4) vs the
        // flat regions (column 0 and column 7).
        const midY = 4;
        const at = (x, y) => edges.data[y * w + x];
        const boundary = Math.max(at(3, midY), at(4, midY));
        const flatLeft = at(0, midY);
        const flatRight = at(7, midY);
        console.log("boundaryStrong", boundary > 200);
        console.log("flatLeftSmall", flatLeft < 50);
        console.log("flatRightSmall", flatRight < 50);
      `,
    );
    expect(stdout).toBe(["boundaryStrong true", "flatLeftSmall true", "flatRightSmall true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rotate 90 swaps dims and maps top-left to top-right", async () => {
    // Build a tiny 2×3 RGBA image with known per-pixel colors so we can
    // verify the rotate-90 mapping pixel-by-pixel.
    //  Layout (3 wide × 2 tall):
    //    A B C
    //    D E F
    //  After 90° CW (2 wide × 3 tall):
    //    D A
    //    E B
    //    F C
    const { stdout, exitCode } = await runFixture(
      "parabun-image-rotate-90",
      `
        import image from "bun:image";
        const w = 3, h = 2;
        const px = (r, g, b) => [r, g, b, 255];
        const A = px(255, 0, 0);   // red
        const B = px(0, 255, 0);   // green
        const C = px(0, 0, 255);   // blue
        const D = px(255, 255, 0); // yellow
        const E = px(0, 255, 255); // cyan
        const F = px(255, 0, 255); // magenta
        const flatten = arr => Uint8Array.from(arr.flat());
        const orig = {
          data: flatten([A, B, C, D, E, F]),
          width: w, height: h, channels: 4, format: "png",
        };
        const r = image.rotate(orig, { degrees: 90 });
        console.log("dims", r.width, r.height, r.channels);
        // Expected layout: row0=[D,A] row1=[E,B] row2=[F,C].
        const expected = flatten([D, A, E, B, F, C]);
        const equal = r.data.length === expected.length && r.data.every((v, i) => v === expected[i]);
        console.log("byteEqual", equal);
      `,
    );
    expect(stdout).toBe(["dims 2 3 4", "byteEqual true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rotate 180 keeps dims and reverses both axes", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-rotate-180",
      `
        import image from "bun:image";
        const w = 3, h = 2;
        const px = (r, g, b) => [r, g, b, 255];
        const A = px(255, 0, 0);
        const B = px(0, 255, 0);
        const C = px(0, 0, 255);
        const D = px(255, 255, 0);
        const E = px(0, 255, 255);
        const F = px(255, 0, 255);
        const flatten = arr => Uint8Array.from(arr.flat());
        const orig = {
          data: flatten([A, B, C, D, E, F]),
          width: w, height: h, channels: 4, format: "png",
        };
        const r = image.rotate(orig, { degrees: 180 });
        console.log("dims", r.width, r.height);
        // 180° flips both axes: [A,B,C; D,E,F] → [F,E,D; C,B,A].
        const expected = flatten([F, E, D, C, B, A]);
        const equal = r.data.every((v, i) => v === expected[i]);
        console.log("byteEqual", equal);
      `,
    );
    expect(stdout).toBe(["dims 3 2", "byteEqual true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rotate 270 is the inverse of rotate 90", async () => {
    // Round-trip: rotate(90) then rotate(270) should reproduce the input.
    const { stdout, exitCode } = await runFixture(
      "parabun-image-rotate-roundtrip",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);                   // 4×4 RGBA
        const r = image.rotate(image.rotate(orig, { degrees: 90 }), { degrees: 270 });
        console.log("dims", r.width, r.height, r.channels);
        const equal = r.data.length === orig.data.length && r.data.every((v, i) => v === orig.data[i]);
        console.log("byteEqual", equal);
      `,
    );
    expect(stdout).toBe(["dims 4 4 4", "byteEqual true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rotate rejects non-cardinal degrees", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-rotate-bad-deg",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        let threw = 0;
        for (const d of [0, 45, 91, 360, -90]) {
          try { image.rotate(orig, { degrees: d }); } catch { threw++; }
        }
        console.log("threw", threw);
      `,
    );
    expect(stdout).toBe("threw 5");
    expect(exitCode).toBe(0);
  });

  it("flip horizontal reverses each row", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-flip-h",
      `
        import image from "bun:image";
        const w = 3, h = 2;
        const px = (r, g, b) => [r, g, b, 255];
        const A = px(255, 0, 0);
        const B = px(0, 255, 0);
        const C = px(0, 0, 255);
        const D = px(255, 255, 0);
        const E = px(0, 255, 255);
        const F = px(255, 0, 255);
        const flatten = arr => Uint8Array.from(arr.flat());
        const orig = {
          data: flatten([A, B, C, D, E, F]),
          width: w, height: h, channels: 4, format: "png",
        };
        const r = image.flip(orig, { axis: "horizontal" });
        console.log("dims", r.width, r.height);
        // Each row reversed: [A,B,C] → [C,B,A]; [D,E,F] → [F,E,D].
        const expected = flatten([C, B, A, F, E, D]);
        console.log("byteEqual", r.data.every((v, i) => v === expected[i]));
      `,
    );
    expect(stdout).toBe(["dims 3 2", "byteEqual true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("flip vertical swaps rows top-to-bottom", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-flip-v",
      `
        import image from "bun:image";
        const w = 3, h = 2;
        const px = (r, g, b) => [r, g, b, 255];
        const A = px(255, 0, 0);
        const B = px(0, 255, 0);
        const C = px(0, 0, 255);
        const D = px(255, 255, 0);
        const E = px(0, 255, 255);
        const F = px(255, 0, 255);
        const flatten = arr => Uint8Array.from(arr.flat());
        const orig = {
          data: flatten([A, B, C, D, E, F]),
          width: w, height: h, channels: 4, format: "png",
        };
        const r = image.flip(orig, { axis: "vertical" });
        // Rows swapped: [A,B,C; D,E,F] → [D,E,F; A,B,C].
        const expected = flatten([D, E, F, A, B, C]);
        console.log("byteEqual", r.data.every((v, i) => v === expected[i]));
      `,
    );
    expect(stdout).toBe("byteEqual true");
    expect(exitCode).toBe(0);
  });

  it("flip applied twice is the identity", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-flip-double",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        const back = image.flip(image.flip(orig, { axis: "horizontal" }), { axis: "horizontal" });
        const equal = back.data.length === orig.data.length && back.data.every((v, i) => v === orig.data[i]);
        console.log("byteEqual", equal);
      `,
    );
    expect(stdout).toBe("byteEqual true");
    expect(exitCode).toBe(0);
  });

  it("flip rejects an unknown axis", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-flip-bad-axis",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        try {
          image.flip(orig, { axis: "diagonal" });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("horizontal"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("crop extracts an interior rectangle pixel-exact", async () => {
    // 4×4 RGBA image with one distinct color per pixel (encoded as
    // [r, g, b, 255] where r = column-index*64, g = row-index*64).
    // Crop a 2×2 from (1, 1) — should grab the four center pixels.
    const { stdout, exitCode } = await runFixture(
      "parabun-image-crop-interior",
      `
        import image from "bun:image";
        const w = 4, h = 4;
        const data = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const off = (y * w + x) * 4;
          data[off] = x * 64; data[off + 1] = y * 64; data[off + 2] = 0; data[off + 3] = 255;
        }
        const orig = { data, width: w, height: h, channels: 4, format: "png" };
        const c = image.crop(orig, { x: 1, y: 1, width: 2, height: 2 });
        console.log("dims", c.width, c.height, c.channels);
        // Expected pixels (x, y) for (1,1) (2,1) (1,2) (2,2):
        //   (1,1) → R=64,  G=64
        //   (2,1) → R=128, G=64
        //   (1,2) → R=64,  G=128
        //   (2,2) → R=128, G=128
        const expected = Uint8Array.from([
          64, 64, 0, 255,
          128, 64, 0, 255,
          64, 128, 0, 255,
          128, 128, 0, 255,
        ]);
        const eq = c.data.length === expected.length && c.data.every((v, i) => v === expected[i]);
        console.log("byteEqual", eq);
      `,
    );
    expect(stdout).toBe(["dims 2 2 4", "byteEqual true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("crop covering the full image is a copy of the original", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-crop-full",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);    // 4×4 RGBA
        const c = image.crop(orig, { x: 0, y: 0, width: orig.width, height: orig.height });
        const sameRef = c.data === orig.data;
        const equal = c.data.length === orig.data.length && c.data.every((v, i) => v === orig.data[i]);
        console.log("dims", c.width, c.height);
        console.log("sameRef", sameRef);
        console.log("byteEqual", equal);
      `,
    );
    expect(stdout).toBe(["dims 4 4", "sameRef false", "byteEqual true"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("crop preserves the source format string", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-crop-format",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        const c = image.crop(orig, { x: 0, y: 0, width: 2, height: 2 });
        console.log("format", c.format);
      `,
    );
    expect(stdout).toBe("format png");
    expect(exitCode).toBe(0);
  });

  it("crop rejects out-of-bounds rectangles", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-crop-oob",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);    // 4×4
        let threw = 0;
        // Each of these extends past the right or bottom edge.
        for (const r of [
          { x: 0, y: 0, width: 5, height: 4 },
          { x: 0, y: 0, width: 4, height: 5 },
          { x: 1, y: 0, width: 4, height: 4 },
          { x: 0, y: 1, width: 4, height: 4 },
        ]) {
          try { image.crop(orig, r); } catch { threw++; }
        }
        console.log("threw", threw);
      `,
    );
    expect(stdout).toBe("threw 4");
    expect(exitCode).toBe(0);
  });

  it("crop rejects negative offsets and zero / negative dims", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-crop-bad-args",
      `
        import image from "bun:image";
        const orig = image.decode(PNG);
        let threw = 0;
        for (const r of [
          { x: -1, y: 0, width: 2, height: 2 },
          { x: 0, y: -1, width: 2, height: 2 },
          { x: 0, y: 0, width: 0, height: 2 },
          { x: 0, y: 0, width: 2, height: -1 },
        ]) {
          try { image.crop(orig, r); } catch { threw++; }
        }
        console.log("threw", threw);
      `,
    );
    expect(stdout).toBe("threw 4");
    expect(exitCode).toBe(0);
  });

  it("rejects malformed JPEG with a clear error message", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-image-bad-jpeg",
      `
        import image from "bun:image";
        // Valid SOI marker (FF D8 FF) + garbage that fails libjpeg's
        // header read. Format detection passes; the codec then throws.
        const bad = new Uint8Array([0xFF, 0xD8, 0xFF, 0x00, 0x00, 0x00, 0x00]);
        try {
          image.decode(bad);
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.startsWith("bun:image.decode:"));
        }
      `,
    );
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });
});
