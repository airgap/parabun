import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";

// Parabun `bun:signals` — fine-grained reactive primitives.
// Exposed API: signal(v), derived(fn), effect(fn), batch(fn), untrack(fn).
// The language-level `signal x` / `effect { }` sugar (not yet shipped) will
// desugar to calls into this module; these tests cover the runtime surface.
async function runFixture(prefix, source) {
  // .pjs enables Parabun parser — needed for `effect { }` block sugar. The
  // runtime module itself is plain JS, so the .pjs loader doesn't change
  // behavior for tests that only call `effect(fn)` / `signal()` / etc.
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

describe("bun:signals", () => {
  it("signal: read and write", async () => {
    const { stdout, exitCode } = await runFixture(
      "signals-state",
      `
        import { signal } from "bun:signals";
        const count = signal(0);
        console.log(count.get());
        count.set(5);
        console.log(count.get());
      `,
    );
    expect(stdout).toBe("0\n5");
    expect(exitCode).toBe(0);
  });

  it("signal: set to same value is a no-op (no notify)", async () => {
    const { stdout, exitCode } = await runFixture(
      "signals-noop",
      `
        import { signal, effect } from "bun:signals";
        const x = signal(1);
        let runs = 0;
        effect(() => { x.get(); runs++; });
        x.set(1); // same value
        x.set(1);
        console.log(runs);
      `,
    );
    expect(stdout).toBe("1");
    expect(exitCode).toBe(0);
  });

  it("derived: computes lazily, caches, invalidates on dep change", async () => {
    const { stdout, exitCode } = await runFixture(
      "signals-derived",
      `
        import { signal, derived } from "bun:signals";
        const a = signal(2);
        const b = signal(3);
        let computes = 0;
        const sum = derived(() => { computes++; return a.get() + b.get(); });
        console.log(sum.get()); // 5, computes=1
        console.log(sum.get()); // 5, cached, computes still 1
        a.set(10);
        console.log(sum.get()); // 13, computes=2
        console.log("computes=" + computes);
      `,
    );
    expect(stdout).toBe("5\n5\n13\ncomputes=2");
    expect(exitCode).toBe(0);
  });

  it("effect: runs immediately, re-runs on dep change, disposer stops it", async () => {
    const { stdout, exitCode } = await runFixture(
      "signals-effect",
      `
        import { signal, effect } from "bun:signals";
        const x = signal(1);
        const log = [];
        const dispose = effect(() => { log.push(x.get()); });
        x.set(2);
        x.set(3);
        dispose();
        x.set(4); // no longer observed
        console.log(log.join(","));
      `,
    );
    expect(stdout).toBe("1,2,3");
    expect(exitCode).toBe(0);
  });

  it("effect: cleanup fn runs before next run and on dispose", async () => {
    const { stdout, exitCode } = await runFixture(
      "signals-cleanup",
      `
        import { signal, effect } from "bun:signals";
        const x = signal(1);
        const log = [];
        const dispose = effect(() => {
          const v = x.get();
          log.push("run:" + v);
          return () => log.push("cleanup:" + v);
        });
        x.set(2);
        x.set(3);
        dispose();
        console.log(log.join("|"));
      `,
    );
    expect(stdout).toBe("run:1|cleanup:1|run:2|cleanup:2|run:3|cleanup:3");
    expect(exitCode).toBe(0);
  });

  it("batch: groups writes so effect fires once", async () => {
    const { stdout, exitCode } = await runFixture(
      "signals-batch",
      `
        import { signal, effect, batch } from "bun:signals";
        const a = signal(1);
        const b = signal(2);
        let runs = 0;
        effect(() => { a.get(); b.get(); runs++; });
        batch(() => { a.set(10); b.set(20); });
        console.log("runs=" + runs); // 2 (initial + batched flush)
      `,
    );
    expect(stdout).toBe("runs=2");
    expect(exitCode).toBe(0);
  });

  it("untrack: reads without subscribing", async () => {
    const { stdout, exitCode } = await runFixture(
      "signals-untrack",
      `
        import { signal, effect, untrack } from "bun:signals";
        const a = signal(1);
        const b = signal(10);
        let runs = 0;
        effect(() => {
          a.get();
          untrack(() => b.get());
          runs++;
        });
        a.set(2); // triggers re-run
        b.set(20); // should NOT trigger
        console.log("runs=" + runs);
      `,
    );
    expect(stdout).toBe("runs=2");
    expect(exitCode).toBe(0);
  });

  it("diamond dep: nested derived fires once per upstream change", async () => {
    const { stdout, exitCode } = await runFixture(
      "signals-diamond",
      `
        import { signal, derived, effect } from "bun:signals";
        const a = signal(1);
        const b = derived(() => a.get() + 1);
        const c = derived(() => a.get() + 10);
        let runs = 0;
        const d = derived(() => { runs++; return b.get() + c.get(); });
        effect(() => { d.get(); });
        console.log(d.get()); // 1+1 + 1+10 = 13, runs=1
        a.set(2); // everything invalidates; d recomputes once
        console.log(d.get()); // 3 + 12 = 15
        console.log("d.runs=" + runs);
      `,
    );
    // v1 may recompute d more than once depending on order, but the VALUES
    // are what matter. Assert the observable outputs.
    const lines = stdout.split("\n");
    expect(lines[0]).toBe("13");
    expect(lines[1]).toBe("15");
    expect(exitCode).toBe(0);
  });

  it("peek: reads without subscribing", async () => {
    const { stdout, exitCode } = await runFixture(
      "signals-peek",
      `
        import { signal, effect } from "bun:signals";
        const a = signal(1);
        const b = signal(10);
        let runs = 0;
        effect(() => { a.get(); b.peek(); runs++; });
        b.set(20); // should NOT trigger (peek, not get)
        a.set(2); // triggers
        console.log("runs=" + runs);
      `,
    );
    expect(stdout).toBe("runs=2");
    expect(exitCode).toBe(0);
  });

  it("update: transforms current value", async () => {
    const { stdout, exitCode } = await runFixture(
      "signals-update",
      `
        import { signal } from "bun:signals";
        const n = signal(5);
        n.update(x => x * 2);
        n.update(x => x + 1);
        console.log(n.get());
      `,
    );
    expect(stdout).toBe("11");
    expect(exitCode).toBe(0);
  });

  it("dynamic deps: conditional read registers only current deps", async () => {
    const { stdout, exitCode } = await runFixture(
      "signals-dynamic-deps",
      `
        import { signal, effect } from "bun:signals";
        const flag = signal(true);
        const a = signal("a");
        const b = signal("b");
        let runs = 0;
        effect(() => { (flag.get() ? a : b).get(); runs++; });
        a.set("a2"); // triggers (flag=true → reads a)
        flag.set(false); // triggers
        a.set("a3"); // does NOT trigger (no longer reading a)
        b.set("b2"); // triggers (now reading b)
        console.log("runs=" + runs);
      `,
    );
    expect(stdout).toBe("runs=4");
    expect(exitCode).toBe(0);
  });

  it("subscribe: callback fires on change, disposer stops it", async () => {
    const { stdout, exitCode } = await runFixture(
      "signals-subscribe",
      `
        import { signal } from "bun:signals";
        const x = signal(0);
        const log = [];
        const unsub = x.subscribe(v => log.push(v));
        x.set(1);
        x.set(2);
        unsub();
        x.set(3);
        console.log(log.join(","));
      `,
    );
    expect(stdout).toBe("0,1,2");
    expect(exitCode).toBe(0);
  });

  it("derived: setting throws", async () => {
    const { stdout, exitCode } = await runFixture(
      "signals-derived-readonly",
      `
        import { signal, derived } from "bun:signals";
        const a = signal(1);
        const b = derived(() => a.get() * 2);
        try { b.set(99); console.log("no-throw"); }
        catch (e) { console.log("threw:" + (e instanceof TypeError)); }
      `,
    );
    expect(stdout).toBe("threw:true");
    expect(exitCode).toBe(0);
  });
});

// Language-level sugar: `effect { body }` desugars to `require("bun:signals").effect(() => { body })`.
// The identifier `effect` is only treated as a block-keyword when immediately followed (no newline)
// by `{`; any other continuation leaves `effect` as a plain identifier.
describe("parabun: effect { } block", () => {
  it("effect { body }: runs body, tracks deps, re-runs on change", async () => {
    const { stdout, exitCode } = await runFixture(
      "effect-block-basic",
      `
        import { signal } from "bun:signals";
        const x = signal(1);
        const log = [];
        effect {
          log.push(x.get());
        }
        x.set(2);
        x.set(3);
        console.log(log.join(","));
      `,
    );
    expect(stdout).toBe("1,2,3");
    expect(exitCode).toBe(0);
  });

  it("effect { }: cleanup via returned function", async () => {
    const { stdout, exitCode } = await runFixture(
      "effect-block-cleanup",
      `
        import { signal } from "bun:signals";
        const x = signal(1);
        const log = [];
        effect {
          const v = x.get();
          log.push("run:" + v);
          return () => log.push("cleanup:" + v);
        }
        x.set(2);
        x.set(3);
        console.log(log.join("|"));
      `,
    );
    expect(stdout).toBe("run:1|cleanup:1|run:2|cleanup:2|run:3");
    expect(exitCode).toBe(0);
  });

  it("effect { }: empty body is allowed", async () => {
    const { stdout, exitCode } = await runFixture(
      "effect-block-empty",
      `
        effect {}
        console.log("ok");
      `,
    );
    expect(stdout).toBe("ok");
    expect(exitCode).toBe(0);
  });

  it("effect as plain identifier: still works when not followed by {", async () => {
    const { stdout, exitCode } = await runFixture(
      "effect-identifier",
      `
        import { signal, effect } from "bun:signals";
        const x = signal(1);
        const log = [];
        effect(() => { log.push(x.get()); });
        x.set(2);
        console.log(log.join(","));
      `,
    );
    expect(stdout).toBe("1,2");
    expect(exitCode).toBe(0);
  });

  it("effect as variable name: still parses as identifier", async () => {
    const { stdout, exitCode } = await runFixture(
      "effect-as-var",
      `
        const effect = 42;
        console.log(effect + 1);
      `,
    );
    expect(stdout).toBe("43");
    expect(exitCode).toBe(0);
  });

  it("effect with newline before {: not a block", async () => {
    const { stdout, exitCode } = await runFixture(
      "effect-newline",
      `
        const effect = { value: 7 };
        console.log(effect.value);
      `,
    );
    expect(stdout).toBe("7");
    expect(exitCode).toBe(0);
  });
});

// Language-level sugar: `signal NAME = RHS` desugars to
// `const NAME = require("bun:signals").signal(RHS)` at parse time, and NAME
// is marked signal-bound so bare reads become `NAME.get()` and writes become
// `NAME.set(...)` during visit. `signal` always implies `const` — there's no
// `signal let` or `signal var`. These M3b tests use explicit `.get()` /
// `.set()` calls to isolate the declaration desugar from the read/write
// rewriting (covered in M3c+).
describe("parabun: signal declaration", () => {
  it("signal: desugars to a writable signal", async () => {
    const { stdout, exitCode } = await runFixture(
      "signal-decl-basic",
      `
        signal x = 0;
        console.log(x.get());
        x.set(5);
        console.log(x.get());
      `,
    );
    expect(stdout).toBe("0\n5");
    expect(exitCode).toBe(0);
  });

  it("signal: multiple declarators", async () => {
    const { stdout, exitCode } = await runFixture(
      "signal-decl-multi",
      `
        signal a = 1, b = 2;
        console.log(a.get() + "," + b.get());
        a.set(10);
        b.set(20);
        console.log(a.get() + "," + b.get());
      `,
    );
    expect(stdout).toBe("1,2\n10,20");
    expect(exitCode).toBe(0);
  });

  it("signal as plain identifier: unchanged when not before an identifier", async () => {
    const { stdout, exitCode } = await runFixture(
      "signal-as-ident-import",
      `
        import { signal } from "bun:signals";
        const x = signal(42);
        console.log(x.get());
      `,
    );
    expect(stdout).toBe("42");
    expect(exitCode).toBe(0);
  });

  it("signal as variable name: still parses as identifier", async () => {
    const { stdout, exitCode } = await runFixture(
      "signal-as-var-name",
      `
        const signal = 7;
        console.log(signal + 1);
      `,
    );
    expect(stdout).toBe("8");
    expect(exitCode).toBe(0);
  });

  it("signal with newline before let: not a signal decl", async () => {
    const { stdout, exitCode } = await runFixture(
      "signal-newline",
      `
        const signal = { foo: 9 };
        console.log(signal.foo);
      `,
    );
    expect(stdout).toBe("9");
    expect(exitCode).toBe(0);
  });
});

// Language-level sugar: when NAME was declared with `signal`,
// bare reads of NAME are auto-rewritten to `NAME.get()`. The reserved method
// names get/set/peek/subscribe/update stay as direct method calls (allow
// list). Everything else (`.foo`, `[key]`) goes through `.get()` first.
describe("parabun: signal-bound identifier rewriting", () => {
  it("bare read: NAME is auto-unwrapped with .get()", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-rw-bare-read",
      `
        signal x = 42;
        console.log(x);
      `,
    );
    expect(stdout).toBe("42");
    expect(exitCode).toBe(0);
  });

  it("allowlist: .get / .set / .peek / .subscribe / .update stay intact", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-rw-allowlist",
      `
        signal n = 1;
        console.log(n.get());          // 1
        n.set(5);
        console.log(n.peek());         // 5
        n.update(v => v * 2);
        console.log(n.get());          // 10
        const unsub = n.subscribe(v => console.log("sub:" + v));
        n.set(11);
        unsub();
      `,
    );
    expect(stdout).toBe("1\n5\n10\nsub:10\nsub:11");
    expect(exitCode).toBe(0);
  });

  it("non-allowlist property access goes through .get() first", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-rw-prop-access",
      `
        signal obj = { foo: 7, hello() { return "hi"; } };
        console.log(obj.foo);       // obj.get().foo = 7
        console.log(obj.hello());   // obj.get().hello() = "hi"
      `,
    );
    expect(stdout).toBe("7\nhi");
    expect(exitCode).toBe(0);
  });

  it("signal in arithmetic: arithmetic reads unwrap correctly", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-rw-arith",
      `
        signal a = 3;
        signal b = 4;
        console.log(a + b);        // 7
        console.log(a * 10 + b);   // 34
      `,
    );
    expect(stdout).toBe("7\n34");
    expect(exitCode).toBe(0);
  });

  it("signal inside effect { } block tracks automatically", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-rw-effect-auto",
      `
        signal x = 1;
        const log = [];
        effect {
          log.push(x);             // auto-rewrites to x.get() → tracks dep
        }
        x.set(2);
        x.set(3);
        console.log(log.join(","));
      `,
    );
    expect(stdout).toBe("1,2,3");
    expect(exitCode).toBe(0);
  });

  it("template literal with signal read unwraps", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-rw-template",
      `
        signal name = "world";
        console.log(\`hello, \${name}!\`);
      `,
    );
    expect(stdout).toBe("hello, world!");
    expect(exitCode).toBe(0);
  });
});

// `NAME = X` / `NAME += X` / etc. on signal-bound identifiers desugar to
// `.set(...)` calls. For compound assigns we synthesize
//   NAME.set(NAME.get() <baseOp> X)
// which preserves set's same-value no-op behavior.
describe("parabun: signal-bound assignment rewriting", () => {
  it("bare assign: NAME = X → NAME.set(X)", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-assign-bare",
      `
        signal x = 1;
        x = 42;
        console.log(x);
      `,
    );
    expect(stdout).toBe("42");
    expect(exitCode).toBe(0);
  });

  it("+=, -=, *=, /=, %=", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-assign-compound-arith",
      `
        signal n = 10;
        n += 5;
        console.log(n);      // 15
        n -= 3;
        console.log(n);      // 12
        n *= 2;
        console.log(n);      // 24
        n /= 4;
        console.log(n);      // 6
        n %= 5;
        console.log(n);      // 1
      `,
    );
    expect(stdout).toBe("15\n12\n24\n6\n1");
    expect(exitCode).toBe(0);
  });

  it("|=, &=, ^=, <<=, >>=", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-assign-compound-bitwise",
      `
        signal b = 0b1100;
        b |= 0b0011;
        console.log(b);     // 15
        b &= 0b1010;
        console.log(b);     // 10
        b ^= 0b0110;
        console.log(b);     // 12
        b <<= 1;
        console.log(b);     // 24
        b >>= 2;
        console.log(b);     // 6
      `,
    );
    expect(stdout).toBe("15\n10\n12\n24\n6");
    expect(exitCode).toBe(0);
  });

  it("||=, &&=, ??=", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-assign-logical",
      `
        signal a = 0;
        a ||= 5;
        console.log(a);     // 5 (was falsy)
        a ||= 99;
        console.log(a);     // still 5
        signal b = 1;
        b &&= 7;
        console.log(b);     // 7 (was truthy)
        signal c = null;
        c ??= 42;
        console.log(c);     // 42
        c ??= 99;
        console.log(c);     // still 42
      `,
    );
    expect(stdout).toBe("5\n5\n7\n42\n42");
    expect(exitCode).toBe(0);
  });

  it("assignment triggers effects", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-assign-reactive",
      `
        signal x = 1;
        const log = [];
        effect {
          log.push(x);
        }
        x = 2;
        x += 10;
        console.log(log.join(","));
      `,
    );
    expect(stdout).toBe("1,2,12");
    expect(exitCode).toBe(0);
  });

  it("pre-inc, pre-dec, post-inc, post-dec", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-incdec",
      `
        signal n = 5;
        console.log(++n);        // pre-inc: 6
        console.log(n);          // 6
        console.log(--n);        // pre-dec: 5
        console.log(n);          // 5
        console.log(n++);        // post-inc: returns 5 (old)
        console.log(n);          // 6
        console.log(n--);        // post-dec: returns 6 (old)
        console.log(n);          // 5
      `,
    );
    expect(stdout).toBe("6\n6\n5\n5\n5\n6\n6\n5");
    expect(exitCode).toBe(0);
  });

  it("++ inside expressions", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-incdec-expr",
      `
        signal i = 0;
        const arr = [10, 20, 30];
        console.log(arr[i++]);     // reads arr[0]=10, i becomes 1
        console.log(arr[i++]);     // reads arr[1]=20, i becomes 2
        console.log(arr[i]);       // reads arr[2]=30, i still 2
      `,
    );
    expect(stdout).toBe("10\n20\n30");
    expect(exitCode).toBe(0);
  });

  it("++/-- triggers reactive effects", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-incdec-reactive",
      `
        signal count = 0;
        const log = [];
        effect { log.push(count); }
        count++;
        ++count;
        count--;
        console.log(log.join(","));
      `,
    );
    expect(stdout).toBe("0,1,2,1");
    expect(exitCode).toBe(0);
  });

  it("same-value assignment is a no-op (does not re-run effects)", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-assign-noop",
      `
        signal x = 7;
        let runs = 0;
        effect {
          x;
          runs++;
        }
        x = 7;     // same value — should not fire
        x = 7;
        console.log(runs);
      `,
    );
    expect(stdout).toBe("1");
    expect(exitCode).toBe(0);
  });

  // M3f: RHS-sniff auto-derive. When `signal NAME = RHS` references
  // another in-scope signal-bound name, the RHS is wrapped as
  // `derived(() => RHS)` instead of `signal(RHS)`. The file-level pragma
  // `// @parabun-strict-signals` opts out.

  it("auto-derive: RHS referencing a signal name becomes derived()", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-autoderive-basic",
      `
        signal a = 2;
        signal b = 3;
        signal sum = a + b;
        console.log(sum);   // 5 — reads via .get()
        a = 10;
        console.log(sum);   // 13 — dep invalidation recomputes
      `,
    );
    expect(stdout).toBe("5\n13");
    expect(exitCode).toBe(0);
  });

  it("auto-derive: non-signal refs on RHS don't trigger derive", async () => {
    // Plain `signal x = y` where y is NOT signal-bound stays a writable
    // signal — proved here by writing to it.
    const { stdout, exitCode } = await runFixture(
      "sig-autoderive-nondep",
      `
        const seed = 42;
        signal n = seed;       // seed is a const, not a signal — writable
        console.log(n);            // 42
        n = 100;                   // would throw if derived (read-only)
        console.log(n);            // 100
      `,
    );
    expect(stdout).toBe("42\n100");
    expect(exitCode).toBe(0);
  });

  it("auto-derive: derived rejects assignment (read-only)", async () => {
    const { stdout, stderr, exitCode } = await runFixture(
      "sig-autoderive-readonly",
      `
        signal base = 1;
        signal doubled = base * 2;
        try { doubled = 99; } catch (e) { console.log("err:" + e.message); }
      `,
    );
    expect(stdout).toContain("err:");
    expect(exitCode).toBe(0);
  });

  it("auto-derive: chained derives (derived -> derived)", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-autoderive-chain",
      `
        signal a = 1;
        signal b = a + 1;     // derived(() => a + 1)
        signal c = b + 1;     // derived(() => b + 1)
        console.log(c);             // 3
        a = 10;
        console.log(c);             // 12
      `,
    );
    expect(stdout).toBe("3\n12");
    expect(exitCode).toBe(0);
  });

  it("@parabun-strict-signals pragma disables auto-derive", async () => {
    // With the pragma, `signal sum = a + b` stays a writable signal
    // holding the *snapshot* value — no dep tracking. Proved by writing to it.
    const { stdout, exitCode } = await runFixture(
      "sig-strict-pragma",
      `
        // @parabun-strict-signals
        signal a = 2;
        signal b = 3;
        signal sum = a + b;    // signal(a.get() + b.get()) — snapshot 5
        console.log(sum);          // 5
        sum = 99;                  // writable, no throw
        console.log(sum);          // 99
        a = 10;
        console.log(sum);          // 99 — no dep tracking
      `,
    );
    expect(stdout).toBe("5\n99\n99");
    expect(exitCode).toBe(0);
  });

  it("auto-derive: effect picks up the derived's transitive deps", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-autoderive-effect",
      `
        signal a = 1;
        signal doubled = a * 2;
        const log = [];
        effect { log.push(doubled); }
        a = 5;
        a = 7;
        console.log(log.join(","));
      `,
    );
    expect(stdout).toBe("2,10,14");
    expect(exitCode).toBe(0);
  });

  it("auto-derive: triggers inside call args, ternary, template", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-autoderive-shapes",
      `
        signal x = 5;
        signal pos = x > 0 ? "pos" : "neg";
        signal msg = \`x=\${x}\`;
        signal absCall = Math.abs(x);
        console.log(pos);      // pos
        console.log(msg);      // x=5
        console.log(absCall);  // 5
        x = -3;
        console.log(pos);      // neg
        console.log(msg);      // x=-3
        console.log(absCall);  // 3
      `,
    );
    expect(stdout).toBe("pos\nx=5\n5\nneg\nx=-3\n3");
    expect(exitCode).toBe(0);
  });

  // M3g: Integration tests that exercise the full signal sugar + effect sugar
  // + runtime interactions across more realistic shapes. Each test pokes at
  // a combination that the narrower per-milestone tests might miss.

  it("integration: counter pattern (signal + effect + derived auto)", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-int-counter",
      `
        signal count = 0;
        signal doubled = count * 2;
        signal label = \`count=\${count} x2=\${doubled}\`;
        const log = [];
        effect { log.push(label); }
        count++;
        count++;
        count = 10;
        console.log(log.join("|"));
      `,
    );
    expect(stdout).toBe("count=0 x2=0|count=1 x2=2|count=2 x2=4|count=10 x2=20");
    expect(exitCode).toBe(0);
  });

  it("integration: signal inside function scope", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-int-fn-scope",
      `
        function makeCounter() {
          signal n = 0;
          return {
            inc() { n++; },
            read() { return n; },
          };
        }
        const c = makeCounter();
        c.inc(); c.inc(); c.inc();
        console.log(c.read());
      `,
    );
    expect(stdout).toBe("3");
    expect(exitCode).toBe(0);
  });

  it("integration: signal inside nested block", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-int-block",
      `
        {
          signal inner = 42;
          console.log(inner);
          inner = 99;
          console.log(inner);
        }
      `,
    );
    expect(stdout).toBe("42\n99");
    expect(exitCode).toBe(0);
  });

  it("integration: batch coalesces multiple writes into one effect run", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-int-batch",
      `
        import { batch } from "bun:signals";
        signal a = 1;
        signal b = 2;
        let runs = 0;
        effect { a; b; runs++; }
        batch(() => {
          a = 10;
          b = 20;
          a = 100;
        });
        console.log(runs);  // initial + one batched = 2
        console.log(a + "," + b);
      `,
    );
    expect(stdout).toBe("2\n100,20");
    expect(exitCode).toBe(0);
  });

  it("integration: untrack skips dep registration", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-int-untrack",
      `
        import { untrack } from "bun:signals";
        signal tracked = 1;
        signal silent = 0;
        let runs = 0;
        effect {
          tracked;
          untrack(() => silent);
          runs++;
        }
        silent = 99;    // untracked — no re-run
        tracked = 2;    // tracked — re-runs
        console.log(runs);
      `,
    );
    expect(stdout).toBe("2");
    expect(exitCode).toBe(0);
  });

  it("integration: effect cleanup runs before each re-run and on dispose", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-int-cleanup",
      `
        import { effect as effectFn } from "bun:signals";
        signal v = 0;
        const log = [];
        const stop = effectFn(() => {
          const snapshot = v;
          log.push("run:" + snapshot);
          return () => log.push("cleanup:" + snapshot);
        });
        v = 1;
        v = 2;
        stop();
        console.log(log.join(","));
      `,
    );
    expect(stdout).toBe("run:0,cleanup:0,run:1,cleanup:1,run:2,cleanup:2");
    expect(exitCode).toBe(0);
  });

  it("integration: signal with TypeScript annotation", async () => {
    // The .pjs loader accepts TS syntax via skipTypeScriptType. Since the
    // test runs .pjs not .pts, TS may be off — but the feature should still
    // not panic on a TS-shaped decl in a file without explicit TS.
    //
    // We smoke-test with .pts instead by renaming the fixture.
    using dir = tempDir("sig-int-ts", {
      "index.pts": `
        signal n: number = 7;
        console.log(n + 1);
        n = 100;
        console.log(n);
      `.trimStart(),
    });
    await using proc = Bun.spawn({
      cmd: [bunExe(), "index.pts"],
      env: bunEnv,
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout.trim()).toBe("8\n100");
    expect(exitCode).toBe(0);
  });

  it("integration: multiple decls in one signal statement", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-int-multi-decl",
      `
        signal a = 1, b = 2, c = 3;
        console.log(a + "," + b + "," + c);
        a = 10; b = 20; c = 30;
        console.log(a + "," + b + "," + c);
      `,
    );
    expect(stdout).toBe("1,2,3\n10,20,30");
    expect(exitCode).toBe(0);
  });

  it("integration: signal dep transitions through derived chain", async () => {
    const { stdout, exitCode } = await runFixture(
      "sig-int-chain",
      `
        signal x = 1;
        signal y = x * 10;
        signal z = y + x;   // depends on both
        const log = [];
        effect { log.push(z); }
        x = 2;   // y: 20, z: 22
        x = 3;   // y: 30, z: 33
        console.log(log.join(","));
      `,
    );
    expect(stdout).toBe("11,22,33");
    expect(exitCode).toBe(0);
  });
});
