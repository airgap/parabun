import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

// Minimal 4×4 RGB PNG: red/blue checkerboard. Generated with Python's
// zlib + struct (no external image lib needed), 87 bytes.
const PNG_4X4_HEX =
  "89504e470d0a1a0a0000000d494844520000000400000004080200000026930929" +
  "000000164944415478da63f8cf0004ff212482f51fcac52a03009ea30ff1dd565c" +
  "ee0000000049454e44ae426082";

// 4×4 RGB JPEG of the same red/blue checkerboard, quality 95. Generated
// via Pillow on the host. Single line so there's no chance of a chunk
// boundary swallowing a byte; ~1344 hex chars / 672 bytes.
// prettier-ignore
const JPEG_4X4_HEX = "ffd8ffe000104a46494600010100000100010000ffdb0043000201010101010201010102020202020403020202020504040304060506060605060606070908060709070606080b08090a0a0a0a0a06080b0c0b0a0c090a0a0affdb004301020202020202050303050a0706070a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0affc00011080004000403012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00fce8f0678334df1be9afaa6a92ec74f2703ec56d3ffadb686e1be6b88a46fbd330e0f38dcdb9d9dd8a28afea83fb50ffd9";

const fixtureSrc = `
  const _hexToBytes = (h) => Uint8Array.from(h.match(/../g).map(x => parseInt(x, 16)));
  const PNG = _hexToBytes("${PNG_4X4_HEX}");
  const JPEG = _hexToBytes("${JPEG_4X4_HEX}");
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
