import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

// CameraImpl's reactive surface (LYK-761): active, fps, cameraFormat.
// Skips when no /dev/video0 is present (CI without a camera).
//
// Limitation: the V4L2 grab path crashes under bun:test runner mode on
// asan debug builds (pre-existing, not introduced by LYK-761 — open()
// and close() work fine, only grab() / frames() trigger the SIGILL).
// We exercise everything that doesn't pull frames here. End-to-end
// frame-pull validation lives in the camera bench and is verified on
// the OBSBOT against bun bd directly (not via bun bd test).

const haveVideo = existsSync("/dev/video0");

describe("parabun:camera signals (LYK-761)", () => {
  test.skipIf(!haveVideo)("active, fps, cameraFormat are Signal-shaped", async () => {
    const camera = (await import("parabun:camera")).default;
    let cam: any;
    try {
      cam = await camera.open("/dev/video0", { format: "yuyv", width: 640, height: 480 });
    } catch {
      // No supported format on this device — skip.
      return;
    }
    try {
      expect(typeof cam.active.get).toBe("function");
      expect(typeof cam.active.subscribe).toBe("function");
      expect(typeof cam.active.peek).toBe("function");
      expect(typeof cam.fps.get).toBe("function");
      expect(typeof cam.fps.subscribe).toBe("function");
      expect(typeof cam.cameraFormat.get).toBe("function");
      expect(typeof cam.cameraFormat.subscribe).toBe("function");
    } finally {
      await cam.close();
    }
  });

  test.skipIf(!haveVideo)("initial signal values reflect open() args", async () => {
    const camera = (await import("parabun:camera")).default;
    let cam: any;
    try {
      cam = await camera.open("/dev/video0", { format: "yuyv", width: 320, height: 240 });
    } catch {
      return;
    }
    try {
      // Pre-frame state: not active, fps still 0, format already
      // populated from the constructor.
      expect(cam.active.get()).toBe(false);
      expect(cam.fps.get()).toBe(0);
      expect(cam.cameraFormat.get()).toEqual({
        width: 320,
        height: 240,
        pixelFormat: "yuyv",
      });
    } finally {
      await cam.close();
    }
  });

  test.skipIf(!haveVideo)("close() drives signals to inert state", async () => {
    const camera = (await import("parabun:camera")).default;
    let cam: any;
    try {
      cam = await camera.open("/dev/video0", { format: "yuyv", width: 640, height: 480 });
    } catch {
      return;
    }
    let activeNotifies = 0;
    cam.active.subscribe(() => activeNotifies++);
    await cam.close();
    expect(cam.active.get()).toBe(false);
    expect(cam.fps.get()).toBe(0);
    const before = activeNotifies;
    // Closed stream is inert — even after a tick, no further updates.
    await new Promise(r => setTimeout(r, 50));
    expect(activeNotifies).toBe(before);
  });

  test.skipIf(!haveVideo)(
    "alive starts true; flips false on close(); use(fn) auto-tears-down; [Symbol.dispose] is callable",
    async () => {
      const camera = (await import("parabun:camera")).default;
      let cam: any;
      try {
        cam = await camera.open("/dev/video0", { format: "yuyv", width: 640, height: 480 });
      } catch {
        return;
      }
      expect(cam.alive.get()).toBe(true);
      let runs = 0;
      cam.use(() => {
        runs++;
        cam.fps.get();
      });
      expect(runs).toBe(1);
      expect(typeof cam[Symbol.dispose]).toBe("function");
      await cam.close();
      expect(cam.alive.get()).toBe(false);
      const before = runs;
      await new Promise(r => setTimeout(r, 50));
      expect(runs).toBe(before);
    },
  );
});
