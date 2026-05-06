// Hardcoded module "@para/lifecycle"
//
// Process-state coordination — SIGINT/SIGTERM-aware keep-alive with
// an optional shutdown hook. Lives next to @para/arena because both
// are about process state, not reactive data flow.
//
// Typical use at the bottom of a long-running CLI/IoT script:
//
//   await lifecycle.keepAlive({
//     onShutdown: () => { chip.close(); ads.close(); },
//   });
//
// Resolves on SIGINT or SIGTERM (configurable). Cleanup runs after
// the signal arrives, before the promise resolves — so the script
// exits cleanly with disposed resources.

interface KeepAliveOptions {
  /**
   * Signals that should resolve the keep-alive. Default
   * `["SIGINT", "SIGTERM"]`. Only POSIX signals; on Windows the
   * runtime maps Ctrl-C to SIGINT for you.
   */
  signals?: NodeJS.Signals[];
  /**
   * Optional cleanup. Awaited after a signal fires, before the
   * keep-alive promise resolves. Throws are logged to stderr but
   * don't reject the promise — the script still exits.
   */
  onShutdown?: () => void | Promise<void>;
}

function keepAlive(options: KeepAliveOptions = {}): Promise<void> {
  const sigs = options.signals ?? (["SIGINT", "SIGTERM"] as NodeJS.Signals[]);
  const { promise, resolve } = Promise.withResolvers<void>();
  let fired = false;
  const handler = () => {
    if (fired) return; // multiple Ctrl-C presses → one shutdown
    fired = true;
    resolve();
  };
  for (const s of sigs) process.on(s, handler);
  return promise.finally(async () => {
    for (const s of sigs) process.off(s, handler);
    if (options.onShutdown) {
      try {
        await options.onShutdown();
      } catch (e) {
        console.error("@para/lifecycle: onShutdown threw:", e);
      }
    }
  });
}

export default {
  keepAlive,
};
