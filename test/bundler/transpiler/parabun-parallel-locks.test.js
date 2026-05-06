import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

async function runFixture(prefix, source) {
  using dir = tempDir(prefix, { "index.ts": source.trimStart() });
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

describe("@para/parallel — Mutex", () => {
  it("lock/unlock, locked predicate, tryLock", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-mutex-basic",
      `
        import { Mutex } from "@para/parallel";
        const m = new Mutex();
        console.log("init.locked", m.locked);
        await m.lock();
        console.log("after.lock.locked", m.locked);
        console.log("tryLock-while-held", m.tryLock());
        m.unlock();
        console.log("after.unlock.locked", m.locked);
        console.log("tryLock-after-unlock", m.tryLock());
        m.unlock();
      `,
    );
    expect(stdout).toBe(
      [
        "init.locked false",
        "after.lock.locked true",
        "tryLock-while-held false",
        "after.unlock.locked false",
        "tryLock-after-unlock true",
      ].join("\n"),
    );
    expect(exitCode).toBe(0);
  });

  it("with() runs the body under the lock and releases on return", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-mutex-with",
      `
        import { Mutex } from "@para/parallel";
        const m = new Mutex();
        const result = await m.with(async () => {
          console.log("inside.locked", m.locked);
          return 42;
        });
        console.log("result", result);
        console.log("after.locked", m.locked);
      `,
    );
    expect(stdout).toBe(["inside.locked true", "result 42", "after.locked false"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("with() releases the lock on a thrown exception", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-mutex-with-throws",
      `
        import { Mutex } from "@para/parallel";
        const m = new Mutex();
        try {
          await m.with(() => { throw new Error("boom"); });
        } catch (e) {
          console.log("caught", e.message);
        }
        console.log("locked", m.locked);
      `,
    );
    expect(stdout).toBe(["caught boom", "locked false"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("serializes concurrent critical sections", async () => {
    // Two awaiting holders should never observe each other inside the
    // critical section. The "active" counter is held in a closure on the
    // main thread (one event loop), but the test still verifies that
    // lock() actually waits for the prior holder to unlock before resolving.
    const { stdout, exitCode } = await runFixture(
      "parabun-mutex-serialize",
      `
        import { Mutex } from "@para/parallel";
        const m = new Mutex();
        let active = 0, maxActive = 0;
        async function critical(id) {
          await m.with(async () => {
            active++;
            maxActive = Math.max(maxActive, active);
            // Yield to the event loop to give a competing holder the chance
            // to (incorrectly) enter if the lock is broken.
            await new Promise(r => queueMicrotask(r));
            await new Promise(r => setTimeout(r, 5));
            active--;
          });
        }
        await Promise.all([1,2,3,4,5].map(critical));
        console.log("maxActive", maxActive);
        console.log("locked", m.locked);
      `,
    );
    expect(stdout).toBe(["maxActive 1", "locked false"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("can wrap an existing SAB to share a lock across instances", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-mutex-shared-sab",
      `
        import { Mutex } from "@para/parallel";
        const a = new Mutex();
        const b = new Mutex(a.sab);          // same backing storage
        await a.lock();
        console.log("a.locked", a.locked, "b.locked", b.locked);
        b.unlock();
        console.log("a.locked", a.locked, "b.locked", b.locked);
      `,
    );
    expect(stdout).toBe(["a.locked true b.locked true", "a.locked false b.locked false"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rejects undersized SAB", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-mutex-bad-sab",
      `
        import { Mutex } from "@para/parallel";
        try {
          new Mutex(new SharedArrayBuffer(2));
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.constructor.name, e.message.includes(">= 4"));
        }
      `,
    );
    expect(stdout).toBe("THREW RangeError true");
    expect(exitCode).toBe(0);
  });
});

describe("@para/parallel — Semaphore", () => {
  it("acquire / release / permits / tryAcquire", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-sem-basic",
      `
        import { Semaphore } from "@para/parallel";
        const s = new Semaphore(2);
        console.log("init", s.permits);
        console.log("tryAcquire-1", s.tryAcquire(), s.permits);
        console.log("tryAcquire-2", s.tryAcquire(), s.permits);
        console.log("tryAcquire-3", s.tryAcquire(), s.permits);    // should fail
        s.release();
        console.log("after.release", s.permits);
        s.release();
        console.log("after.release2", s.permits);
      `,
    );
    expect(stdout).toBe(
      [
        "init 2",
        "tryAcquire-1 true 1",
        "tryAcquire-2 true 0",
        "tryAcquire-3 false 0",
        "after.release 1",
        "after.release2 2",
      ].join("\n"),
    );
    expect(exitCode).toBe(0);
  });

  it("await acquire blocks until a release", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-sem-blocking",
      `
        import { Semaphore } from "@para/parallel";
        const s = new Semaphore(0);
        let done = false;
        const p = (async () => { await s.acquire(); done = true; })();
        // Yield several microtasks so the awaiter has every chance to
        // (incorrectly) resolve early. It shouldn't.
        for (let i = 0; i < 10; i++) await Promise.resolve();
        console.log("preReleaseDone", done);
        s.release();
        await p;
        console.log("postReleaseDone", done);
        console.log("permits", s.permits);
      `,
    );
    expect(stdout).toBe(["preReleaseDone false", "postReleaseDone true", "permits 0"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("with() limits concurrency to N permits", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-sem-limit",
      `
        import { Semaphore } from "@para/parallel";
        const s = new Semaphore(3);
        let active = 0, maxActive = 0;
        async function task() {
          await s.with(async () => {
            active++;
            maxActive = Math.max(maxActive, active);
            await new Promise(r => setTimeout(r, 5));
            active--;
          });
        }
        await Promise.all(Array.from({ length: 10 }, task));
        console.log("maxActive", maxActive);
        console.log("permits", s.permits);
      `,
    );
    expect(stdout).toBe(["maxActive 3", "permits 3"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("with() releases on a thrown exception", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-sem-with-throws",
      `
        import { Semaphore } from "@para/parallel";
        const s = new Semaphore(1);
        try {
          await s.with(() => { throw new Error("boom"); });
        } catch (e) {
          console.log("caught", e.message);
        }
        console.log("permits", s.permits);
      `,
    );
    expect(stdout).toBe(["caught boom", "permits 1"].join("\n"));
    expect(exitCode).toBe(0);
  });

  it("rejects negative initial permits", async () => {
    const { stdout, exitCode } = await runFixture(
      "parabun-sem-bad-init",
      `
        import { Semaphore } from "@para/parallel";
        try {
          new Semaphore(-1);
          console.log("NO_THROW");
        } catch (e) {
          console.log("THREW", e.constructor.name);
        }
      `,
    );
    expect(stdout).toBe("THREW RangeError");
    expect(exitCode).toBe(0);
  });
});
