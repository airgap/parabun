/**
 * minimp3 — single-header MP3 decoder. ~3000 lines, MIT, no external deps.
 * Backs `bun:audio.decodeMp3`. Header-only, so no .a is produced; we
 * include `<minimp3.h>` and `<minimp3_ex.h>` directly from
 * parabun_audio_codecs.cpp with the implementation macro defined there.
 */

import type { Dependency } from "../source.ts";

const MINIMP3_COMMIT = "7b590fdcfa5a79c033e76eacc05d0c3e4c79f536";

export const minimp3: Dependency = {
  name: "minimp3",
  versionMacro: "MINIMP3_HASH",

  source: () => ({
    kind: "github-archive",
    repo: "lieff/minimp3",
    commit: MINIMP3_COMMIT,
  }),

  build: () => ({ kind: "none" }),

  provides: () => ({
    libs: [],
    includes: ["."],
  }),
};
