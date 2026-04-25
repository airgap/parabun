/**
 * libwebp — Google's WebP decoder/encoder. Backs `bun:image` for the
 * WebP codec path. Lossy + lossless decode in one library.
 */

import type { Dependency } from "../source.ts";

const LIBWEBP_COMMIT = "b7e29b9d75bd31422b00c2a446d49d7af06c328d"; // v1.6.0

export const libwebp: Dependency = {
  name: "libwebp",
  versionMacro: "LIBWEBP_HASH",

  source: () => ({
    kind: "github-archive",
    repo: "webmproject/libwebp",
    commit: LIBWEBP_COMMIT,
  }),

  build: () => ({
    kind: "nested-cmake",
    targets: ["webp", "webpdecoder", "webpdemux"],
    args: {
      // Static-only build. We link the .a/.lib into bun-debug; the
      // shared lib variants are pure overhead for our use case.
      BUILD_SHARED_LIBS: "OFF",
      WEBP_BUILD_ANIM_UTILS: "OFF",
      WEBP_BUILD_CWEBP: "OFF",
      WEBP_BUILD_DWEBP: "OFF",
      WEBP_BUILD_GIF2WEBP: "OFF",
      WEBP_BUILD_IMG2WEBP: "OFF",
      WEBP_BUILD_VWEBP: "OFF",
      WEBP_BUILD_WEBPINFO: "OFF",
      WEBP_BUILD_LIBWEBPMUX: "OFF",
      WEBP_BUILD_WEBPMUX: "OFF",
      WEBP_BUILD_EXTRAS: "OFF",
    },
  }),

  // The static targets we built produce libwebp.a + libwebpdecoder.a +
  // libwebpdemux.a. The encoder API (WebPEncode*) lives in libwebp;
  // the standalone decoder library (libwebpdecoder) is a subset of
  // libwebp suitable for decode-only builds. We link both since the
  // codec binding needs encode + decode.
  //
  // Headers are at src/webp/{decode.h, encode.h, types.h, ...} in the
  // source tree. The cmake build generates no extra headers.
  provides: () => ({
    libs: ["webpdemux", "webp", "webpdecoder"],
    includes: ["src"],
  }),
};
