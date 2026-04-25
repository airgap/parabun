/**
 * libpng — PNG decode/encode. Backs `bun:image` for the PNG codec path.
 * Depends on zlib (already vendored, link order in `index.ts` ensures
 * libpng comes after zlib).
 */

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

  build: () => ({
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
    },
  }),

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
