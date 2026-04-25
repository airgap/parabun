// Hardcoded module "bun:image"
//
// Parabun: image decode / encode / resize / filter — a Sharp-class module
// baked into the runtime so apps don't need to npm-install a binary
// distribution that drifts with Node ABI versions.
//
//   import image from "bun:image";
//   const img = await image.decode(bytes);
//   const small = await image.resize(img, { width: 256, fit: "cover" });
//   const jpeg = await image.encode(small, { format: "jpeg", quality: 85 });
//
// Codecs: JPEG (libjpeg-turbo), PNG (libpng) ship first; WebP / AVIF
// follow. Resize takes the bun:gpu 2D-convolution kernel when one is
// available + the input is large enough to win; otherwise CPU-path
// (lanczos) via SIMD-accelerated kernels in `bun:simd`.
//
// Tracks LYK-723 (decode/encode/resize) — gated behind the upcoming
// `bun:gpu` 2D-convolution kernel (LYK-724) for the GPU resize path.
// Today this module is a placeholder that throws; the dep vendoring is
// in place so the FFI bindings can land in the next PR without
// reshuffling the build.

const NOT_IMPLEMENTED_MSG =
  "bun:image is scaffolded but not yet implemented — see https://linear.app/lyku/issue/LYK-723";

function todo(): never {
  throw new Error(NOT_IMPLEMENTED_MSG);
}

export default {
  decode(_bytes: Uint8Array): Promise<unknown> {
    return todo();
  },
  encode(_img: unknown, _opts: unknown): Promise<Uint8Array> {
    return todo();
  },
  resize(_img: unknown, _opts: unknown): Promise<unknown> {
    return todo();
  },
};
