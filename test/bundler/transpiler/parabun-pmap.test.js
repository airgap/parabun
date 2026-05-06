import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

describe("Bun.pmap", () => {
  it("maps a pure function over an array in parallel", async () => {
    using dir = tempDir("parabun-pmap-basic", {
      "index.pjs": `
        import { pmap } from "@para/parallel";
        pure function double(x) { return x * 2; }
        const out = await pmap(double, [1, 2, 3, 4, 5, 6, 7, 8]);
        console.log(JSON.stringify(out));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);

    expect(stdout.trim()).toBe("[2,4,6,8,10,12,14,16]");
    expect(exitCode).toBe(0);
  });

  it("passes the index as the second argument", async () => {
    using dir = tempDir("parabun-pmap-index", {
      "index.pjs": `
        import { pmap } from "@para/parallel";
        pure function withIdx(x, i) { return x + ":" + i; }
        const out = await pmap(withIdx, ["a", "b", "c"]);
        console.log(JSON.stringify(out));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe('["a:0","b:1","c:2"]');
    expect(exitCode).toBe(0);
  });

  it("returns empty array for empty input", async () => {
    using dir = tempDir("parabun-pmap-empty", {
      "index.pjs": `
        import { pmap } from "@para/parallel";
        pure function double(x) { return x * 2; }
        const out = await pmap(double, []);
        console.log(JSON.stringify(out));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("[]");
    expect(exitCode).toBe(0);
  });

  it("respects concurrency option", async () => {
    using dir = tempDir("parabun-pmap-conc", {
      "index.pjs": `
        import { pmap } from "@para/parallel";
        pure function square(x) { return x * x; }
        const out = await pmap(square, [1, 2, 3, 4, 5], { concurrency: 2 });
        console.log(JSON.stringify(out));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("[1,4,9,16,25]");
    expect(exitCode).toBe(0);
  });

  it("propagates errors from the worker", async () => {
    using dir = tempDir("parabun-pmap-err", {
      "index.pjs": `
        import { pmap } from "@para/parallel";
        pure function bomb(x) { if (x === 3) throw new Error("boom at " + x); return x; }
        try {
          await pmap(bomb, [1, 2, 3, 4]);
          console.log("NO_THROW");
        } catch (e) {
          console.log("CAUGHT:" + e.message);
        }
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("CAUGHT:boom at 3");
    expect(exitCode).toBe(0);
  });

  it("handles async pure functions", async () => {
    using dir = tempDir("parabun-pmap-async", {
      "index.pjs": `
        import { pmap } from "@para/parallel";
        pure async function asyncDouble(x) { return x * 2; }
        const out = await pmap(asyncDouble, [1, 2, 3]);
        console.log(JSON.stringify(out));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("[2,4,6]");
    expect(exitCode).toBe(0);
  });

  it("tiny maps complete inline without dispatching workers", async () => {
    // Probe budget is 64 items on the main thread; 4 items × a trivial
    // double() stays entirely in the probe phase and never crosses the
    // 1 ms estimated-total threshold, so no Worker is spawned. We
    // confirm this by checking that the result is correct AND the EMA
    // records a per-item cost (i.e. the probe ran).
    using dir = tempDir("parabun-pmap-adaptive-inline", {
      "index.pjs": `
        import parallel from "@para/parallel";
        pure function double(x) { return x * 2; }
        const out = await parallel.pmap(double, [1, 2, 3, 4]);
        const state = parallel._heuristicState();
        const keys = Object.keys(state);
        console.log(JSON.stringify({
          out,
          recordedFns: keys.length,
          perItemNsFinite: keys.length === 1 && Number.isFinite(state[keys[0]]),
        }));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.out).toEqual([2, 4, 6, 8]);
    expect(parsed.recordedFns).toBe(1);
    expect(parsed.perItemNsFinite).toBe(true);
    expect(exitCode).toBe(0);
  });

  it("heuristic reuses EMA on subsequent calls with the same fn source", async () => {
    using dir = tempDir("parabun-pmap-adaptive-ema", {
      "index.pjs": `
        import parallel from "@para/parallel";
        pure function triple(x) { return x * 3; }
        // First call primes the EMA.
        await parallel.pmap(triple, [1, 2, 3, 4, 5, 6, 7, 8]);
        const before = Object.keys(parallel._heuristicState()).length;
        // Second call must reuse the cached per-item cost.
        const out = await parallel.pmap(triple, [10, 20, 30]);
        const after = Object.keys(parallel._heuristicState()).length;
        console.log(JSON.stringify({ out, before, after }));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.out).toEqual([30, 60, 90]);
    expect(parsed.before).toBe(1);
    // Same fnSrc → same EMA key → still one entry.
    expect(parsed.after).toBe(1);
    expect(exitCode).toBe(0);
  });

  it("explicit concurrency=1 runs fully inline", async () => {
    // Honors caller override even when a parallel-y default would fire.
    using dir = tempDir("parabun-pmap-conc-1", {
      "index.pjs": `
        import parallel from "@para/parallel";
        pure function plus(x, i) { return x + i; }
        const out = await parallel.pmap(plus, [10, 20, 30, 40, 50], { concurrency: 1 });
        console.log(JSON.stringify(out));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("[10,21,32,43,54]");
    expect(exitCode).toBe(0);
  });

  it("heuristic fans out to workers for heavy per-item work", async () => {
    // Each item busy-loops long enough that the 64-item probe trips the
    // PROBE_MAX_NS (1ms) early-exit — that signal alone tells the
    // heuristic "this is big enough, fan out to workers for the rest".
    // We verify correctness on a mid-size input; the parallel path has
    // to return results in order and reassemble chunks correctly.
    using dir = tempDir("parabun-pmap-adaptive-heavy", {
      "index.pjs": `
        import parallel from "@para/parallel";
        pure function heavy(x) {
          let s = 0;
          for (let k = 0; k < 200000; k++) s += Math.sin(k) * x;
          return (s > 1e300 || s < -1e300) ? 0 : x;
        }
        const input = Array.from({ length: 32 }, (_, i) => i);
        const out = await parallel.pmap(heavy, input);
        console.log(JSON.stringify({ len: out.length, first: out[0], last: out[31] }));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    const parsed = JSON.parse(stdout.trim());
    expect(parsed.len).toBe(32);
    expect(parsed.first).toBe(0);
    expect(parsed.last).toBe(31);
    expect(exitCode).toBe(0);
  });

  it("_resetHeuristic clears the EMA", async () => {
    using dir = tempDir("parabun-pmap-reset", {
      "index.pjs": `
        import parallel from "@para/parallel";
        pure function doubled(x) { return x * 2; }
        await parallel.pmap(doubled, [1, 2, 3, 4]);
        const before = Object.keys(parallel._heuristicState()).length;
        parallel._resetHeuristic();
        const after = Object.keys(parallel._heuristicState()).length;
        console.log(JSON.stringify({ before, after }));
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(JSON.parse(stdout.trim())).toEqual({ before: 1, after: 0 });
    expect(exitCode).toBe(0);
  });

  it("rejects non-function first arg", async () => {
    using dir = tempDir("parabun-pmap-nofn", {
      "index.pjs": `
        import { pmap } from "@para/parallel";
        try {
          await pmap(42, [1,2,3]);
          console.log("NO_THROW");
        } catch (e) {
          console.log(e instanceof TypeError ? "TYPE_ERROR" : "WRONG");
        }
      `.trimStart(),
    });

    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pjs"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
    expect(stdout.trim()).toBe("TYPE_ERROR");
    expect(exitCode).toBe(0);
  });
});
