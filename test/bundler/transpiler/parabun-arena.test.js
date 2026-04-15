import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

async function runFixture(prefix, source) {
  using dir = tempDir(prefix, { "index.pjs": source.trimStart() });
  await using proc = Bun.spawn({
    cmd: [bunExe(), "index.pjs"],
    env: bunEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
}

describe("bun:arena", () => {
  it("acquires and releases a Uint8Array of the requested size", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-arena-acquire",
      `
        import arena from "bun:arena";
        const pool = new arena.Pool(Uint8Array, 1024);
        const buf = pool.acquire();
        console.log(buf.constructor.name, buf.length);
        pool.release(buf);
      `,
    );
    expect(stdout).toBe("Uint8Array 1024");
    expect(exitCode).toBe(0);
  });

  it("recycles released buffers (same identity on next acquire)", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-arena-recycle",
      `
        import arena from "bun:arena";
        const pool = new arena.Pool(Uint8Array, 64);
        const a = pool.acquire();
        a[0] = 42;
        pool.release(a);
        const b = pool.acquire();
        console.log(a === b, b[0]);
      `,
    );
    expect(stdout).toBe("true 42");
    expect(exitCode).toBe(0);
  });

  it("clear:true zeroes recycled buffers; default keeps bytes", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-arena-clear",
      `
        import arena from "bun:arena";
        const dirty = new arena.Pool(Uint8Array, 8);
        const clean = new arena.Pool(Uint8Array, 8, { clear: true });
        for (const pool of [dirty, clean]) {
          const a = pool.acquire(); a[0] = 9; pool.release(a);
          console.log(pool.acquire()[0]);
        }
      `,
    );
    expect(stdout).toBe("9\n0");
    expect(exitCode).toBe(0);
  });

  it("use(fn) returns the value and releases on throw", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-arena-use",
      `
        import arena from "bun:arena";
        const pool = new arena.Pool(Uint8Array, 16);
        const sum = pool.use(buf => { for (let i = 0; i < buf.length; i++) buf[i] = i; return buf.reduce((a,b)=>a+b,0); });
        try { pool.use(() => { throw new Error("x"); }); } catch {}
        console.log(sum, pool.stats().free);
      `,
    );
    expect(stdout).toBe("120 1");
    expect(exitCode).toBe(0);
  });

  it("prewarm fills the free list", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-arena-prewarm",
      `
        import arena from "bun:arena";
        const pool = new arena.Pool(Uint8Array, 32, { prewarm: 4 });
        console.log(pool.stats().free);
      `,
    );
    expect(stdout).toBe("4");
    expect(exitCode).toBe(0);
  });

  it("scope(fn) returns fn's value", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-arena-scope-return",
      `
        import arena from "bun:arena";
        console.log(arena.scope(() => 42));
        console.log(JSON.stringify(arena.scope(() => ({ a: 1, b: [2, 3] }))));
      `,
    );
    expect(stdout).toBe('42\n{"a":1,"b":[2,3]}');
    expect(exitCode).toBe(0);
  });

  it("scope(fn) propagates synchronous exceptions and releases the GC deferral", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-arena-scope-throw",
      `
        import arena from "bun:arena";
        try { arena.scope(() => { throw new Error("boom"); }); }
        catch (e) { console.log(e.message); }
        // If the deferral leaked, this Bun.gc(true) (sync full) would assert/hang.
        Bun.gc(true);
        console.log(arena.scope(() => "still-works"));
      `,
    );
    expect(stdout).toBe("boom\nstill-works");
    expect(exitCode).toBe(0);
  });

  it("scope(fn) nests correctly", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-arena-scope-nested",
      `
        import arena from "bun:arena";
        const out = arena.scope(() => arena.scope(() => arena.scope(() => 7 * 6)));
        console.log(out);
      `,
    );
    expect(stdout).toBe("42");
    expect(exitCode).toBe(0);
  });

  it("scope(fn) throws TypeError on non-callable", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-arena-scope-non-callable",
      `
        import arena from "bun:arena";
        try { arena.scope(123); console.log("no-throw"); }
        catch (e) { console.log(e instanceof TypeError ? "TypeError" : "Other"); }
      `,
    );
    expect(stdout).toBe("TypeError");
    expect(exitCode).toBe(0);
  });

  it("rejects shape-mismatched buffers on release", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-arena-mismatch",
      `
        import arena from "bun:arena";
        const pool = new arena.Pool(Uint8Array, 32);
        try { pool.release(new Uint8Array(64)); console.log("no-throw"); }
        catch (e) { console.log(e instanceof TypeError ? "TypeError" : "Other"); }
      `,
    );
    expect(stdout).toBe("TypeError");
    expect(exitCode).toBe(0);
  });
});
