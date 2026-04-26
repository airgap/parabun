/**
 * rnnoise — Xiph's RNN-based noise suppression. Trained on speech +
 * noise mixtures; produces dramatically cleaner voice than spectral-
 * subtraction methods. Used in Discord, Audacity, and elsewhere.
 *
 * Upstream uses autotools, but the runtime is just six .c files plus
 * headers. We compile them via the `direct` build pattern. Per-dep
 * cflags suppress upstream's null-deref idioms that bun's strict
 * warnings-as-errors otherwise reject.
 */

import type { Dependency } from "../source.ts";

// v0.1.1 — last release that ships the trained-model C source (rnn_data.c)
// directly in the tree. v0.2+ generates rnn_data.c from a downloaded
// model, which doesn't fit our vendor-tarball-only flow.
const RNNOISE_COMMIT = "6cbfd53eb348a8d394e0757b4025c6ded34eb2b6"; // v0.1.1

export const rnnoise: Dependency = {
  name: "rnnoise",
  versionMacro: "RNNOISE_HASH",

  source: () => ({
    kind: "github-archive",
    repo: "xiph/rnnoise",
    commit: RNNOISE_COMMIT,
  }),

  build: () => ({
    kind: "direct",
    // Six runtime sources. rnn_reader.c (loads external models) isn't
    // needed since rnn_data.c bakes in the default model.
    sources: ["src/celt_lpc.c", "src/denoise.c", "src/kiss_fft.c", "src/pitch.c", "src/rnn.c", "src/rnn_data.c"],
    // src/ has internal headers; include/ has the public rnnoise.h.
    // Reference compile: `gcc -I../include` from src/, so both dirs
    // need to be on the path.
    includes: ["src", "include"],
    cflags: [
      // rnn.c uses `*((int*)0) = 0;` deliberately as an unreachable-code
      // hint. Clang's -Wnull-dereference (default in our build) flags it
      // and -Werror promotes it to a build break. Suppress just this
      // warning; the rest of bun's strict-warnings policy still applies.
      "-Wno-null-dereference",
      // Some celt_lpc / pitch files have unused-but-set variables in
      // SIMD code paths conditionally compiled out. Match upstream's
      // own permissive cflags for these files.
      "-Wno-unused-but-set-variable",
      "-Wno-unused-function",
    ],
  }),

  provides: () => ({
    libs: ["rnnoise"],
    includes: ["include"],
  }),
};
