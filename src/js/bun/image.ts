// Hardcoded module "bun:image"
//
// Parabun: image decode / encode / resize / filter — a Sharp-class module
// baked into the runtime so apps don't need to npm-install a binary
// distribution that drifts with Node ABI versions.
//
//   import image from "bun:image";
//   const img = await image.decode(bytes);
//   // img: { data: Uint8Array, width, height, channels, format }
//
// Codecs (v1):
//   - JPEG: libjpeg-turbo, decoded as 3-channel RGB.
//   - PNG:  libpng, decoded as 4-channel RGBA.
// Both libs are statically linked into the Parabun binary; no external
// install needed. Format is auto-detected from the magic-byte prefix.
//
// Encode + WebP/AVIF + resize (via bun:gpu conv2D) follow in subsequent
// commits — tracks LYK-723.

const native = $cpp("parabun_image_codecs.cpp", "createParabunImageCodecs");

const NOT_IMPLEMENTED_MSG =
  "bun:image is scaffolded but not yet implemented — see https://linear.app/lyku/issue/LYK-723";

function todo(): never {
  throw new Error(NOT_IMPLEMENTED_MSG);
}

type ImageFormat = "jpeg" | "png" | "webp";
type DecodedImage = {
  data: Uint8Array;
  width: number;
  height: number;
  channels: number;
  format: ImageFormat;
};
type EncodeOptions = {
  format: ImageFormat;
  /** JPEG / WebP quality 1-100. Ignored for PNG. Default 85. */
  quality?: number;
  /** WebP only — opt into lossless mode. PNG is always lossless. Default false. */
  lossless?: boolean;
};
type ResizeOptions = {
  width: number;
  height: number;
};

function decode(bytes: Uint8Array): DecodedImage {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("bun:image.decode: expected Uint8Array");
  }
  return native.decode(bytes);
}

function encode(img: DecodedImage, opts: EncodeOptions): Uint8Array {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("bun:image.encode: img must be the object returned from decode()");
  }
  if (typeof opts !== "object" || opts === null || typeof opts.format !== "string") {
    throw new TypeError('bun:image.encode: opts must be { format: "jpeg" | "png", quality? }');
  }
  return native.encode(img, opts);
}

function resize(img: DecodedImage, opts: ResizeOptions): DecodedImage {
  if (typeof img !== "object" || img === null) {
    throw new TypeError("bun:image.resize: img must be the object returned from decode()");
  }
  if (typeof opts !== "object" || opts === null) {
    throw new TypeError("bun:image.resize: opts must be { width, height }");
  }
  return native.resize(img, opts);
}

export default {
  decode,
  encode,
  resize,
};
