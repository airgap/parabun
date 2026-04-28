/**
 * libpng — PNG decode/encode. Backs `bun:image` for the PNG codec path.
 * Depends on zlib (already vendored, link order in `index.ts` ensures
 * libpng comes after zlib).
 */

import { join } from "node:path";
import type { Dependency } from "../source.ts";
import { depBuildDir } from "../source.ts";

const LIBPNG_COMMIT = "fdc7185dfedbddce8c2487bc171f66af4fca24ab"; // v1.6.58

export const libpng: Dependency = {
  name: "libpng",
  versionMacro: "LIBPNG_HASH",

  source: () => ({
    kind: "github-archive",
    repo: "pnggroup/libpng",
    commit: LIBPNG_COMMIT,
  }),

  // libpng's CMakeLists references zlib via find_package; we inject our
  // vendored zlib's headers + lib via fetchDeps so the configure step
  // sees them before invoking cmake.
  fetchDeps: ["zlib"],

  build: cfg => {
    // Point find_package(ZLIB) at our vendored zlib build instead of the
    // host's system zlib. Native x86_64 builds happen to work because
    // /usr/lib/.../libz.so is present and architecturally compatible —
    // cross-compile breaks the moment cmake's CMAKE_FIND_ROOT_PATH=ONLY
    // restricts the lookup to the cross sysroot, where there's no zlib
    // unless we install zlib1g-dev:arm64 (Ubuntu archive doesn't even
    // serve that without ports.ubuntu.com gymnastics). Explicit paths
    // are simpler: the build sequencer guarantees zlib's libz.a + headers
    // exist by the time libpng configures (fetchDeps: ["zlib"]).
    const zlibBuild = depBuildDir(cfg, "zlib");
    const zlibLib = join(zlibBuild, `${cfg.libPrefix}z${cfg.libSuffix}`);
    return {
      kind: "nested-cmake",
      targets: ["png_static"],
      args: {
        PNG_STATIC: "ON",
        PNG_SHARED: "OFF",
        PNG_TESTS: "OFF",
        PNG_TOOLS: "OFF",
        PNG_FRAMEWORK: "OFF",
        // Skip the optional command-line utilities (pngfix, pngimage, etc).
        PNG_EXECUTABLES: "OFF",
        // Explicit zlib paths — see comment above.
        ZLIB_LIBRARY: zlibLib,
        ZLIB_INCLUDE_DIR: zlibBuild,
      },
    };
  },

  // Static lib output names:
  //   Unix release: libpng16.a            → "png16"
  //   Unix debug:   libpng16d.a           → "png16d"   (CMAKE_DEBUG_POSTFIX="d")
  //   Win release:  libpng16_static.lib   → "libpng16_static"
  //   Win debug:    libpng16_staticd.lib  → "libpng16_staticd"
  // png.h / pngconf.h live at the source root; pnglibconf.h is generated
  // into the build dir by cmake configure.
  provides: cfg => {
    const suffix = cfg.debug ? "d" : "";
    const lib = cfg.windows ? `libpng16_static${suffix}` : `png16${suffix}`;
    return {
      libs: [lib],
      includes: [".", depBuildDir(cfg, "libpng")],
    };
  },
};
