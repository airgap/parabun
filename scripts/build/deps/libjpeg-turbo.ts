/**
 * libjpeg-turbo — JPEG decode/encode with SIMD acceleration. Backs
 * `bun:image` for the JPEG codec path.
 */

import type { Dependency } from "../source.ts";
import { depBuildDir } from "../source.ts";

const LIBJPEG_TURBO_COMMIT = "e352b02f794f701407b39af08576035ba3360d60"; // 3.1.4

export const libjpegTurbo: Dependency = {
  name: "libjpeg-turbo",
  versionMacro: "LIBJPEG_TURBO_HASH",

  source: () => ({
    kind: "github-archive",
    repo: "libjpeg-turbo/libjpeg-turbo",
    commit: LIBJPEG_TURBO_COMMIT,
  }),

  build: () => ({
    kind: "nested-cmake",
    targets: ["jpeg-static"],
    args: {
      // Static-only — we link the .a/.lib into bun-debug.
      ENABLE_STATIC: "ON",
      ENABLE_SHARED: "OFF",
      // Drop the C++ TurboJPEG wrapper and the cjpeg/djpeg/jpegtran CLI tools.
      // We bind to libjpeg directly from `bun:image`.
      WITH_TURBOJPEG: "OFF",
      WITH_JAVA: "OFF",
      // Don't pollute the system; we just need the .a in the build dir.
      CMAKE_INSTALL_PREFIX: "install",
    },
  }),

  // Output lib name varies — Unix produces `libjpeg.a`, Windows produces
  // `jpeg-static.lib` (cmake adds the `-static` suffix on win32 to
  // distinguish from the import lib for the DLL build, which we don't ship).
  //
  // libjpeg-turbo 3.x moved jpeglib.h / jmorecfg.h / jerror.h into `src/`.
  // The `.` entry is kept for legacy reasons; native x86_64 builds happened
  // to compile because they picked up the host's `/usr/include/jpeglib.h`
  // when libjpeg-turbo-dev was installed system-wide. Cross-compile to
  // aarch64 uses the staged jammy sysroot which lacks libjpeg headers, so
  // the missing `src/` entry was breaking the build.
  // jconfig.h is generated into the build dir by cmake configure.
  provides: cfg => ({
    libs: [cfg.windows ? "jpeg-static" : "jpeg"],
    includes: ["src", ".", depBuildDir(cfg, "libjpeg-turbo")],
  }),
};
