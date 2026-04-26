/**
 * libopus — Xiph's Opus codec. Voice + music in a single low-latency
 * algorithm; what every WebRTC client uses for voice channels. Backs
 * `bun:audio`'s opusEncoder / opusDecoder.
 */

import type { Dependency } from "../source.ts";

const LIBOPUS_COMMIT = "a5d6c1b6f4e582df97390f9ac5c6e7c51cbffffe"; // v1.6.1

export const libopus: Dependency = {
  name: "libopus",
  versionMacro: "LIBOPUS_HASH",

  source: () => ({
    kind: "github-archive",
    repo: "xiph/opus",
    commit: LIBOPUS_COMMIT,
  }),

  build: () => ({
    kind: "nested-cmake",
    targets: ["opus"],
    args: {
      // Static lib only; no shared, no extra programs.
      BUILD_SHARED_LIBS: "OFF",
      OPUS_BUILD_PROGRAMS: "OFF",
      OPUS_BUILD_TESTING: "OFF",
      OPUS_BUILD_SHARED_LIBRARY: "OFF",
      OPUS_INSTALL_PKG_CONFIG_MODULE: "OFF",
      OPUS_INSTALL_CMAKE_CONFIG_MODULE: "OFF",
    },
  }),

  // Headers live at include/opus.h in the source tree (the public API).
  // The static lib lands as libopus.a / opus.lib at the build root.
  provides: () => ({
    libs: ["opus"],
    includes: ["include"],
  }),
};
