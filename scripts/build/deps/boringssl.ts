/**
 * BoringSSL — Google's OpenSSL fork. Provides TLS, all crypto primitives,
 * and the x509 machinery that node:crypto needs.
 */

import type { Dependency } from "../source.ts";

const BORINGSSL_COMMIT = "0c5fce43b7ed5eb6001487ee48ac65766f5ddcd1";

export const boringssl: Dependency = {
  name: "boringssl",
  versionMacro: "BORINGSSL",

  source: () => ({
    kind: "github-archive",
    repo: "oven-sh/boringssl",
    commit: BORINGSSL_COMMIT,
  }),

  build: cfg => ({
    kind: "nested-cmake",
    // No explicit targets — defaults to lib names (crypto, ssl, decrepit).
    // BoringSSL's cmake targets match its output library names.
    args: {},
    // BoringSSL builds with -Werror -Wdeprecated-declarations. clang-21
    // flags get_temporary_buffer inside jammy's libstdc++-12 headers as
    // deprecated; gcc-12 itself silences this for its own STL. The
    // diagnostic only fires on the cross path because native x86_64
    // builds use noble's newer libstdc++-14 headers where the dep is
    // already removed. Suppress for cross only.
    extraCxxFlags: cfg.linux && cfg.arm64 && cfg.host.arch !== "aarch64" ? ["-Wno-deprecated-declarations"] : undefined,
  }),

  provides: () => ({
    libs: ["crypto", "ssl", "decrepit"],
    includes: ["include"],
  }),
};
