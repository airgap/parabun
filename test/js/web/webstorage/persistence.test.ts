import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";
import { existsSync } from "node:fs";
import { join } from "node:path";

// 10 MiB counted as (key + value UTF-16 code units) x 2. The on-disk blobs
// are UTF-16LE, so SQLite's byte length() of k and v is exactly that charge.
const QUOTA = 10 * 1024 * 1024;

async function run(dir: string, args: string[], env: Record<string, string | undefined> = {}) {
  await using proc = Bun.spawn({
    cmd: [bunExe(), ...args],
    cwd: dir,
    env: { ...bunEnv, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  return { stdout, stderr, exitCode };
}

async function runJson(dir: string, args: string[], env: Record<string, string | undefined> = {}) {
  const { stdout, stderr, exitCode } = await run(dir, args, env);
  expect(stderr, stderr).toBe("");
  expect(exitCode).toBe(0);
  return JSON.parse(stdout.trim().split("\n").at(-1)!);
}

// Opens the finished file and checks the on-disk contract: schema, pragmas and
// that meta.total equals the byte length of every stored key and value.
function inspectFile(path: string) {
  const db = new Database(path);
  try {
    const tables = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map(r => r.name);
    const userVersion = db.query<{ user_version: number }, []>("PRAGMA user_version").get()!.user_version;
    const journalMode = db.query<{ journal_mode: string }, []>("PRAGMA journal_mode").get()!.journal_mode;
    const count = db.query<{ n: number }, []>("SELECT COUNT(*) AS n FROM items").get()!.n;
    const bytes = db.query<{ b: number | null }, []>("SELECT SUM(length(k) + length(v)) AS b FROM items").get()!.b;
    const metaRows = db.query<{ total: number }, []>("SELECT total FROM meta").all();
    return { tables, userVersion, journalMode, count, bytes: bytes ?? 0, metaRows };
  } finally {
    db.close();
  }
}

describe("web storage persistence: cross-process", () => {
  test("process A writes, process B reads, insertion order and lone surrogates survive", async () => {
    using dir = tempDir("webstorage-persist-ab", {
      "write.js": `
        localStorage.setItem("a", "1");
        localStorage.setItem("b", "2");
        localStorage.setItem("\\ud800\\0", "\\0\\udfff");
        localStorage.setItem("a", "overwritten");
        localStorage.setItem("gone", "x");
        localStorage.removeItem("gone");
        console.log(JSON.stringify({ length: localStorage.length }));
      `,
      "read.js": `
        console.log(JSON.stringify({
          length: localStorage.length,
          a: localStorage.getItem("a"),
          b: localStorage.getItem("b"),
          surrogate: localStorage.getItem("\\ud800\\0"),
          gone: localStorage.getItem("gone"),
          keys: [localStorage.key(0), localStorage.key(1), localStorage.key(2), localStorage.key(3)],
          objectKeys: Object.keys(localStorage),
        }));
      `,
    });
    const file = join(String(dir), "ls.sqlite");

    const written = await runJson(String(dir), [`--localstorage-file=${file}`, "write.js"]);
    expect(written.length).toBe(3);
    expect(existsSync(file)).toBe(true);

    const read = await runJson(String(dir), [`--localstorage-file=${file}`, "read.js"]);
    expect(read).toEqual({
      length: 3,
      a: "overwritten",
      b: "2",
      surrogate: "\0\udfff",
      gone: null,
      keys: ["a", "b", "\ud800\0", null],
      objectKeys: ["a", "b", "\ud800\0"],
    });

    const info = inspectFile(file);
    expect(info.tables).toEqual(["items", "meta"]);
    expect(info.userVersion).toBe(1);
    expect(info.journalMode).toBe("wal");
    expect(info.count).toBe(3);
    expect(info.metaRows).toEqual([{ total: info.bytes }]);
    // ("a" + "overwritten") + ("b" + "2") + ("\ud800\0" + "\0\udfff") code units, times two.
    expect(info.bytes).toBe((1 + 11 + 1 + 1 + 2 + 2) * 2);
  });

  test("a relative path resolves against the process cwd", async () => {
    using dir = tempDir("webstorage-persist-rel", {
      "write.js": `localStorage.setItem("k", "v"); console.log(JSON.stringify({ ok: true }));`,
      "sub": {},
    });
    const out = await runJson(String(dir), ["--localstorage-file=rel.sqlite", "write.js"]);
    expect(out.ok).toBe(true);
    expect(existsSync(join(String(dir), "rel.sqlite"))).toBe(true);

    const nested = await runJson(String(dir), ["--localstorage-file=./sub/nested.sqlite", "write.js"]);
    expect(nested.ok).toBe(true);
    expect(existsSync(join(String(dir), "sub", "nested.sqlite"))).toBe(true);
  });

  test("a relative path resolves against --cwd, not the launch directory", async () => {
    using launch = tempDir("webstorage-persist-launch", {
      "write.js": `localStorage.setItem("k", "v"); console.log(JSON.stringify({ cwd: process.cwd() }));`,
    });
    using target = tempDir("webstorage-persist-target", {});
    const script = join(String(launch), "write.js");

    const out = await runJson(String(launch), ["--cwd", String(target), "--localstorage-file=rel.sqlite", script]);
    expect(out.cwd).toBe(String(target));
    expect(existsSync(join(String(target), "rel.sqlite"))).toBe(true);
    expect(existsSync(join(String(launch), "rel.sqlite"))).toBe(false);

    // Flag order must not matter: --cwd after the storage flag still wins.
    const reversed = await runJson(String(launch), [
      "--localstorage-file=reversed.sqlite",
      "--cwd",
      String(target),
      script,
    ]);
    expect(reversed.cwd).toBe(String(target));
    expect(existsSync(join(String(target), "reversed.sqlite"))).toBe(true);
    expect(existsSync(join(String(launch), "reversed.sqlite"))).toBe(false);
  });

  test("space-separated --localstorage-file <path> works and appears in process.execArgv", async () => {
    using dir = tempDir("webstorage-persist-execargv", {
      "write.js": `
        localStorage.setItem("k", "v");
        console.log(JSON.stringify({
          execArgv: process.execArgv,
          argv: process.argv.slice(2),
          present: typeof Storage === "function" && typeof sessionStorage === "object",
        }));
      `,
      "read.js": `console.log(JSON.stringify({ k: localStorage.getItem("k"), execArgv: process.execArgv }));`,
      "print.js": `console.log(JSON.stringify({ execArgv: process.execArgv, hasSession: typeof sessionStorage === "object" }));`,
    });
    const file = join(String(dir), "ls.sqlite");

    const written = await runJson(String(dir), ["--localstorage-file", file, "write.js", "extra"]);
    expect(written.present).toBe(true);
    expect(written.execArgv).toEqual(["--localstorage-file", file]);
    expect(written.argv).toEqual(["extra"]);

    const read = await runJson(String(dir), [`--localstorage-file=${file}`, "read.js"]);
    expect(read.k).toBe("v");
    expect(read.execArgv).toEqual([`--localstorage-file=${file}`]);

    const session = await runJson(String(dir), ["--experimental-webstorage", "print.js"]);
    expect(session).toEqual({ execArgv: ["--experimental-webstorage"], hasSession: true });
  });

  test("child_process.fork inherits the flag through execArgv", async () => {
    using dir = tempDir("webstorage-persist-fork", {
      "parent.js": `
        const { fork } = require("node:child_process");
        localStorage.setItem("fromParent", "1");
        const child = fork(require("node:path").join(import.meta.dir, "child.js"));
        child.on("message", msg => {
          console.log(JSON.stringify(msg));
          child.disconnect();
        });
      `,
      "child.js": `
        process.send({
          execArgv: process.execArgv,
          fromParent: typeof localStorage === "object" ? localStorage.getItem("fromParent") : null,
        });
      `,
    });
    const file = join(String(dir), "ls.sqlite");
    const out = await runJson(String(dir), ["--localstorage-file", file, "parent.js"]);
    expect(out).toEqual({ execArgv: ["--localstorage-file", file], fromParent: "1" });
  });

  test("a bad directory fails lazily on the first operation with ERR_INVALID_STATE and a cause", async () => {
    using dir = tempDir("webstorage-persist-bad-dir", {
      "bad.js": `
        const file = process.env.WS_FILE;
        const fs = require("node:fs");
        const out = {};
        out.type = typeof localStorage;
        out.instanceOf = localStorage instanceof Storage;
        out.toStringTag = Object.prototype.toString.call(localStorage);
        out.existsAfterGlobalAccess = fs.existsSync(file);
        const capture = fn => {
          try {
            fn();
            return { threw: false };
          } catch (e) {
            return {
              threw: true,
              isError: e instanceof Error,
              code: e.code,
              message: e.message,
              hasCause: e.cause !== undefined,
              causeIsError: e.cause instanceof Error,
              causeName: e.cause && e.cause.name,
            };
          }
        };
        out.setItem = capture(() => localStorage.setItem("k", "v"));
        out.getItem = capture(() => localStorage.getItem("k"));
        out.length = capture(() => localStorage.length);
        out.existsAfterFailure = fs.existsSync(file);
        console.log(JSON.stringify(out));
      `,
    });
    const file = join(String(dir), "does-not-exist", "ls.sqlite");
    const out = await runJson(String(dir), [`--localstorage-file=${file}`, "bad.js"], { WS_FILE: file });

    expect(out.type).toBe("object");
    expect(out.instanceOf).toBe(true);
    expect(out.toStringTag).toBe("[object Storage]");
    expect(out.existsAfterGlobalAccess).toBe(false);
    for (const op of ["setItem", "getItem", "length"]) {
      expect(out[op].threw, op).toBe(true);
      expect(out[op].isError, op).toBe(true);
      expect(out[op].code, op).toBe("ERR_INVALID_STATE");
      expect(out[op].message, op).toContain("unable to open database file");
      expect(out[op].hasCause, op).toBe(true);
      expect(out[op].causeIsError, op).toBe(true);
      expect(out[op].causeName, op).toBe("SQLiteError");
    }
    expect(out.existsAfterFailure).toBe(false);
  });

  test("a good path creates no file until the first operation", async () => {
    using dir = tempDir("webstorage-persist-lazy", {
      "lazy.js": `
        const fs = require("node:fs");
        const file = process.env.WS_FILE;
        const before = fs.existsSync(file);
        void localStorage;
        void (localStorage instanceof Storage);
        void Object.prototype.toString.call(localStorage);
        const afterGlobal = fs.existsSync(file);
        localStorage.getItem("anything");
        const afterOp = fs.existsSync(file);
        console.log(JSON.stringify({ before, afterGlobal, afterOp }));
      `,
    });
    const file = join(String(dir), "ls.sqlite");
    const out = await runJson(String(dir), [`--localstorage-file=${file}`, "lazy.js"], { WS_FILE: file });
    expect(out).toEqual({ before: false, afterGlobal: false, afterOp: true });
  });
});

describe("web storage persistence: concurrency", () => {
  // Modelled on test/js/bun/sqlite/sqlite-cross-process.js: separate processes
  // hammer one file and the parent verifies the result afterwards. Without
  // busy_timeout two of three writers die with SQLITE_BUSY.
  test("3 processes x 2000 setItem calls on one file: no errors, every key present, meta.total exact", async () => {
    const PROCESSES = 3;
    const PER_PROCESS = 2000;
    using dir = tempDir("webstorage-concurrency", {
      "writer.js": `
          const prefix = process.env.WS_PREFIX;
          const n = Number(process.env.WS_N);
          let errors = 0;
          let firstError = null;
          for (let i = 0; i < n; i++) {
            try {
              localStorage.setItem(prefix + "-" + i, "value-" + prefix + "-" + i);
            } catch (e) {
              errors++;
              firstError ??= String(e && e.stack || e);
            }
          }
          console.log(JSON.stringify({ errors, firstError }));
          process.exit(errors === 0 ? 0 : 1);
        `,
      "reader.js": `
          console.log(JSON.stringify({
            length: localStorage.length,
            keyCount: Object.keys(localStorage).length,
            first: localStorage.getItem("p0-0"),
            last: localStorage.getItem("p2-1999"),
          }));
        `,
    });
    const file = join(String(dir), "ls.sqlite");

    const results = await Promise.all(
      Array.from({ length: PROCESSES }, (_, p) =>
        run(String(dir), [`--localstorage-file=${file}`, "writer.js"], {
          WS_PREFIX: `p${p}`,
          WS_N: String(PER_PROCESS),
        }),
      ),
    );
    for (const [p, r] of results.entries()) {
      expect(r.stderr, `writer ${p} stderr`).toBe("");
      expect(r.exitCode, `writer ${p} exit`).toBe(0);
      expect(JSON.parse(r.stdout.trim()), `writer ${p}`).toEqual({ errors: 0, firstError: null });
    }

    const total = PROCESSES * PER_PROCESS;
    const read = await runJson(String(dir), [`--localstorage-file=${file}`, "reader.js"]);
    expect(read).toEqual({ length: total, keyCount: total, first: "value-p0-0", last: "value-p2-1999" });

    const info = inspectFile(file);
    expect(info.count).toBe(total);
    expect(info.metaRows).toEqual([{ total: info.bytes }]);
    expect(info.bytes).toBeLessThanOrEqual(QUOTA);
    expect(info.userVersion).toBe(1);
    expect(info.journalMode).toBe("wal");
  }, 120_000);

  test("two processes racing to fill the quota never exceed 10 MiB", async () => {
    // 128 Ki code units per value is about 256 KiB per item, so each writer
    // needs dozens of transactions to reach the quota and they interleave.
    const VALUE_UNITS = 128 * 1024;
    using dir = tempDir("webstorage-quota-race", {
      "filler.js": `
          const prefix = process.env.WS_PREFIX;
          const value = "x".repeat(${VALUE_UNITS});
          let ok = 0;
          let hit = null;
          for (let i = 0; i < 1000 && hit === null; i++) {
            try {
              localStorage.setItem(prefix + "-" + i, value);
              ok++;
            } catch (e) {
              hit = {
                name: e.name,
                code: e.code,
                isDOMException: e instanceof DOMException,
                message: e.message,
              };
            }
          }
          console.log(JSON.stringify({ ok, hit }));
        `,
      "reader.js": `
          const out = { length: localStorage.length };
          try {
            localStorage.setItem("more", "y".repeat(${VALUE_UNITS}));
            out.anotherAfterFull = "stored";
          } catch (e) {
            out.anotherAfterFull = e.name;
          }
          console.log(JSON.stringify(out));
        `,
    });
    const file = join(String(dir), "ls.sqlite");

    const [a, b] = await Promise.all(
      ["a", "b"].map(prefix => run(String(dir), [`--localstorage-file=${file}`, "filler.js"], { WS_PREFIX: prefix })),
    );
    for (const [name, r] of [
      ["a", a],
      ["b", b],
    ] as const) {
      expect(r.stderr, `filler ${name} stderr`).toBe("");
      expect(r.exitCode, `filler ${name} exit`).toBe(0);
    }
    const outA = JSON.parse(a.stdout.trim());
    const outB = JSON.parse(b.stdout.trim());
    for (const out of [outA, outB]) {
      expect(out.hit).toEqual({
        name: "QuotaExceededError",
        code: 22,
        isDOMException: true,
        message: expect.any(String),
      });
    }

    const info = inspectFile(file);
    expect(info.count).toBe(outA.ok + outB.ok);
    expect(info.metaRows).toEqual([{ total: info.bytes }]);
    expect(info.bytes).toBeLessThanOrEqual(QUOTA);
    // Both writers stopped only because the store was full: one more item
    // of this size would have crossed the line.
    expect(info.bytes + VALUE_UNITS * 2).toBeGreaterThan(QUOTA);

    const read = await runJson(String(dir), [`--localstorage-file=${file}`, "reader.js"]);
    expect(read).toEqual({ length: outA.ok + outB.ok, anotherAfterFull: "QuotaExceededError" });
  }, 120_000);
});
