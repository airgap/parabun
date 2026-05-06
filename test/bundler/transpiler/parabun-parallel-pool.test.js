import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";
import path from "node:path";

async function runFixture(prefix, files) {
  using dir = tempDir(prefix, files);
  await using proc = Bun.spawn({
    cmd: [bunExe(), "index.ts"],
    env: bunEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe("@para/parallel — pool", () => {
  it("runs an exported function on a worker and returns the result", async () => {
    const { stdout, exitCode } = await runFixture("parabun-pool-basic", {
      "worker.ts": `
        export function double(x: number) { return x * 2; }
      `,
      "index.ts": `
        import { pool } from "@para/parallel";
        import path from "node:path";
        const p = pool({ size: 2, module: "file://" + path.resolve("./worker.ts") });
        const result = await p.run("double", 21);
        console.log("result", result, "size", p.size);
        p.dispose();
      `,
    });
    expect(stdout).toBe("result 42 size 2");
    expect(exitCode).toBe(0);
  });

  it("dispatches concurrent calls across multiple workers", async () => {
    // 4 workers, 8 concurrent calls. We assert all 8 results come back
    // correctly, which exercises the dispatch + queue path. We don't
    // assert wall-time speedup — debug-build overhead makes it flaky to
    // set a tight bound, and the queue test below covers the same
    // dispatch invariant deterministically.
    const { stdout, exitCode } = await runFixture("parabun-pool-parallel", {
      "worker.ts": `
        export async function busy(ms: number, tag: number) {
          await new Promise(r => setTimeout(r, ms));
          return tag;
        }
      `,
      "index.ts": `
        import { pool } from "@para/parallel";
        import path from "node:path";
        const p = pool({ size: 4, module: "file://" + path.resolve("./worker.ts") });
        const tags = await Promise.all(
          Array.from({ length: 8 }, (_, i) => p.run("busy", 5, i)),
        );
        p.dispose();
        console.log("tags", tags.sort((a, b) => a - b).join(","));
      `,
    });
    expect(stdout).toBe("tags 0,1,2,3,4,5,6,7");
    expect(exitCode).toBe(0);
  });

  it("queues calls past pool capacity (FIFO drain)", async () => {
    // 2-worker pool, 6 calls. The first 2 run immediately; the rest wait
    // for an idle worker. All 6 should still complete and return their
    // tags.
    const { stdout, exitCode } = await runFixture("parabun-pool-queue", {
      "worker.ts": `
        export async function tagged(t: number) {
          await new Promise(r => setTimeout(r, 5));
          return t * 10;
        }
      `,
      "index.ts": `
        import { pool } from "@para/parallel";
        import path from "node:path";
        const p = pool({ size: 2, module: "file://" + path.resolve("./worker.ts") });
        const out = await Promise.all([0, 1, 2, 3, 4, 5].map(t => p.run("tagged", t)));
        p.dispose();
        console.log(out.join(","));
      `,
    });
    expect(stdout).toBe("0,10,20,30,40,50");
    expect(exitCode).toBe(0);
  });

  it("propagates errors from a thrown function back to the caller", async () => {
    const { stdout, exitCode } = await runFixture("parabun-pool-throw", {
      "worker.ts": `
        export function explode() { throw new Error("kaboom from worker"); }
      `,
      "index.ts": `
        import { pool } from "@para/parallel";
        import path from "node:path";
        const p = pool({ size: 2, module: "file://" + path.resolve("./worker.ts") });
        try {
          await p.run("explode");
          console.log("NO_THROW");
        } catch (e) {
          console.log("CAUGHT", e.message);
        }
        p.dispose();
      `,
    });
    expect(stdout).toBe("CAUGHT kaboom from worker");
    expect(exitCode).toBe(0);
  });

  it("rejects calls to a missing export", async () => {
    const { stdout, exitCode } = await runFixture("parabun-pool-missing-fn", {
      "worker.ts": `
        export function present() { return 1; }
      `,
      "index.ts": `
        import { pool } from "@para/parallel";
        import path from "node:path";
        const p = pool({ size: 1, module: "file://" + path.resolve("./worker.ts") });
        try {
          await p.run("absent");
          console.log("NO_THROW");
        } catch (e) {
          console.log("CAUGHT", e.message.includes("function not exported"));
        }
        p.dispose();
      `,
    });
    expect(stdout).toBe("CAUGHT true");
    expect(exitCode).toBe(0);
  });

  it("dispose() rejects pending calls", async () => {
    const { stdout, exitCode } = await runFixture("parabun-pool-dispose-pending", {
      "worker.ts": `
        export async function slow() {
          await new Promise(r => setTimeout(r, 200));
          return "done";
        }
      `,
      "index.ts": `
        import { pool } from "@para/parallel";
        import path from "node:path";
        const p = pool({ size: 1, module: "file://" + path.resolve("./worker.ts") });
        const racer = p.run("slow").then(
          () => "RESOLVED",
          (e) => "REJECTED:" + e.message,
        );
        // Dispose before the worker can finish.
        await new Promise(r => setTimeout(r, 10));
        p.dispose();
        console.log(await racer);
      `,
    });
    expect(stdout).toBe("REJECTED:@para/parallel pool: disposed");
    expect(exitCode).toBe(0);
  });

  it("rejects relative module paths up front", async () => {
    const { stdout, exitCode } = await runFixture("parabun-pool-relative-rejected", {
      "index.ts": `
        import { pool } from "@para/parallel";
        try {
          pool({ size: 1, module: "./worker.ts" });
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.message.includes("must be absolute"));
        }
      `,
    });
    expect(stdout).toBe("THREW true");
    expect(exitCode).toBe(0);
  });

  it("default export's exported function is reachable too", async () => {
    const { stdout, exitCode } = await runFixture("parabun-pool-default", {
      "worker.ts": `
        export default { triple: (x: number) => x * 3 };
      `,
      "index.ts": `
        import { pool } from "@para/parallel";
        import path from "node:path";
        const p = pool({ size: 1, module: "file://" + path.resolve("./worker.ts") });
        const r = await p.run("triple", 7);
        p.dispose();
        console.log(r);
      `,
    });
    expect(stdout).toBe("21");
    expect(exitCode).toBe(0);
  });
});
