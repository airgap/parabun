import { describe, expect, test } from "bun:test";
import { bunEnv, bunExe, normalizeBunSnapshot, tempDir } from "harness";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Every test here spawns a fresh process. The globals are installed per
// Zig::GlobalObject from process-wide CLI state, so the test runner's own
// flags must never leak into what is being asserted.
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

const NAMES = ["Storage", "localStorage", "sessionStorage"] as const;

const probe = `
  const names = ${JSON.stringify(NAMES)};
  const own = Object.getOwnPropertyNames(globalThis);
  console.log(JSON.stringify({
    in: Object.fromEntries(names.map(n => [n, n in globalThis])),
    own: Object.fromEntries(names.map(n => [n, own.includes(n)])),
    type: Object.fromEntries(names.map(n => [n, typeof globalThis[n]])),
  }));
`;

const absent = { Storage: false, localStorage: false, sessionStorage: false };
const sessionOnly = { Storage: true, localStorage: false, sessionStorage: true };
const all = { Storage: true, localStorage: true, sessionStorage: true };

describe.concurrent("web storage gating: which globals exist", () => {
  test("no flags: nothing is installed", async () => {
    using dir = tempDir("webstorage-gate-off", { "probe.js": probe });
    const out = await runJson(String(dir), ["probe.js"]);
    expect(out.in).toEqual(absent);
    expect(out.own).toEqual(absent);
    expect(out.type).toEqual({ Storage: "undefined", localStorage: "undefined", sessionStorage: "undefined" });
  });

  test("--experimental-webstorage: Storage and sessionStorage, no localStorage", async () => {
    using dir = tempDir("webstorage-gate-session", { "probe.js": probe });
    const out = await runJson(String(dir), ["--experimental-webstorage", "probe.js"]);
    expect(out.in).toEqual(sessionOnly);
    expect(out.own).toEqual(sessionOnly);
    expect(out.type).toEqual({ Storage: "function", localStorage: "undefined", sessionStorage: "object" });
  });

  test("--localstorage-file=<path>: all three", async () => {
    using dir = tempDir("webstorage-gate-file", { "probe.js": probe });
    const file = join(String(dir), "ls.sqlite");
    const out = await runJson(String(dir), [`--localstorage-file=${file}`, "probe.js"]);
    expect(out.in).toEqual(all);
    expect(out.own).toEqual(all);
    expect(out.type).toEqual({ Storage: "function", localStorage: "object", sessionStorage: "object" });
  });

  test("--localstorage-file combined with --experimental-webstorage: all three", async () => {
    using dir = tempDir("webstorage-gate-file-and-session", { "probe.js": probe });
    const file = join(String(dir), "ls.sqlite");
    const out = await runJson(String(dir), [`--localstorage-file=${file}`, "--experimental-webstorage", "probe.js"]);
    expect(out.in).toEqual(all);
  });

  test("--no-experimental-webstorage alone: all absent", async () => {
    using dir = tempDir("webstorage-gate-no", { "probe.js": probe });
    const out = await runJson(String(dir), ["--no-experimental-webstorage", "probe.js"]);
    expect(out.in).toEqual(absent);
  });

  test("--no-experimental-webstorage wins over --experimental-webstorage in either order", async () => {
    using dir = tempDir("webstorage-gate-no-vs-session", { "probe.js": probe });
    const first = await runJson(String(dir), ["--no-experimental-webstorage", "--experimental-webstorage", "probe.js"]);
    expect(first.in).toEqual(absent);
    const second = await runJson(String(dir), [
      "--experimental-webstorage",
      "--no-experimental-webstorage",
      "probe.js",
    ]);
    expect(second.in).toEqual(absent);
  });

  test("--no-experimental-webstorage wins over --localstorage-file and creates no file", async () => {
    using dir = tempDir("webstorage-gate-no-vs-file", {
      "probe.js": probe,
      "touch.js": `
        console.log(JSON.stringify({ type: typeof localStorage }));
      `,
    });
    const file = join(String(dir), "ls.sqlite");
    const out = await runJson(String(dir), [`--localstorage-file=${file}`, "--no-experimental-webstorage", "probe.js"]);
    expect(out.in).toEqual(absent);
    const reversed = await runJson(String(dir), [
      "--no-experimental-webstorage",
      `--localstorage-file=${file}`,
      "touch.js",
    ]);
    expect(reversed.type).toBe("undefined");
    expect(existsSync(file)).toBe(false);
  });

  test("BUN_OPTIONS=--localstorage-file=<path> enables all three", async () => {
    using dir = tempDir("webstorage-gate-bun-options", { "probe.js": probe });
    const file = join(String(dir), "ls.sqlite");
    const out = await runJson(String(dir), ["probe.js"], { BUN_OPTIONS: `--localstorage-file=${file}` });
    expect(out.in).toEqual(all);
  });

  test("BUN_OPTIONS=--experimental-webstorage enables Storage and sessionStorage", async () => {
    using dir = tempDir("webstorage-gate-bun-options-session", { "probe.js": probe });
    const out = await runJson(String(dir), ["probe.js"], { BUN_OPTIONS: "--experimental-webstorage" });
    expect(out.in).toEqual(sessionOnly);
  });

  test("BUN_OPTIONS=--no-experimental-webstorage overrides a command line --localstorage-file", async () => {
    using dir = tempDir("webstorage-gate-bun-options-no", { "probe.js": probe });
    const file = join(String(dir), "ls.sqlite");
    const out = await runJson(String(dir), [`--localstorage-file=${file}`, "probe.js"], {
      BUN_OPTIONS: "--no-experimental-webstorage",
    });
    expect(out.in).toEqual(absent);
  });

  test("empty --localstorage-file= is a CLI error, exit 1, script never runs", async () => {
    using dir = tempDir("webstorage-gate-empty", { "probe.js": `console.log("RAN");` });
    const { stdout, stderr, exitCode } = await run(String(dir), ["--localstorage-file=", "probe.js"]);
    expect(exitCode).toBe(1);
    expect(stdout).not.toContain("RAN");
    expect(stderr).toContain("error:");
    expect(stderr).toContain("--localstorage-file");
  });

  // A path that begins or ends with whitespace is almost always a quoting
  // mistake, and SQLite would silently create the oddly named file.
  test("--localstorage-file with leading or trailing whitespace is a CLI error, exit 1, script never runs", async () => {
    using dir = tempDir("webstorage-gate-whitespace", { "probe.js": `console.log("RAN");` });
    const file = join(String(dir), "x.db");
    const argvs = [
      [`--localstorage-file=${file} `, "probe.js"],
      ["--localstorage-file", ` ${file}`, "probe.js"],
    ];
    for (const argv of argvs) {
      const { stdout, stderr, exitCode } = await run(String(dir), argv);
      expect(exitCode).toBe(1);
      expect(stdout).not.toContain("RAN");
      expect(stderr).toContain("Invalid value for --localstorage-file: must not begin or end with whitespace");
    }
  });
});

describe.concurrent("web storage gating: property descriptors", () => {
  const descriptors = `
    const names = ${JSON.stringify(NAMES)};
    const shape = d => d && ({
      kind: "value" in d ? "data" : "accessor",
      hasGet: "get" in d,
      hasSet: "set" in d,
      writable: d.writable,
      enumerable: d.enumerable,
      configurable: d.configurable,
    });
    const out = {};
    // propertyIsEnumerable and Object.keys consult attributes only, so this
    // snapshot is taken before any getter has run.
    out.enumerableBefore = Object.fromEntries(
      names.map(n => [n, Object.prototype.propertyIsEnumerable.call(globalThis, n)]),
    );
    const keysBefore = Object.keys(globalThis);
    out.inKeysBefore = Object.fromEntries(names.map(n => [n, keysBefore.includes(n)]));
    // getOwnPropertyDescriptor is the first read of each name.
    out.firstRead = Object.fromEntries(names.map(n => [n, shape(Object.getOwnPropertyDescriptor(globalThis, n))]));
    out.afterRead = Object.fromEntries(names.map(n => [n, shape(Object.getOwnPropertyDescriptor(globalThis, n))]));
    out.enumerableAfter = Object.fromEntries(
      names.map(n => [n, Object.prototype.propertyIsEnumerable.call(globalThis, n)]),
    );
    const keysAfter = Object.keys(globalThis);
    out.inKeysAfter = Object.fromEntries(names.map(n => [n, keysAfter.includes(n)]));
    out.types = Object.fromEntries(names.map(n => [n, typeof globalThis[n]]));
    out.localIdentity = localStorage === localStorage && globalThis.localStorage === localStorage;
    out.sessionIdentity = sessionStorage === sessionStorage && globalThis.sessionStorage === sessionStorage;
    out.storageIdentity = Storage === Storage && globalThis.Storage === Storage;
    out.distinctInstances = localStorage !== sessionStorage;
    out.instanceOf = localStorage instanceof Storage && sessionStorage instanceof Storage;
    out.descriptorValueIsGlobal =
      Object.getOwnPropertyDescriptor(globalThis, "localStorage").value === localStorage &&
      Object.getOwnPropertyDescriptor(globalThis, "sessionStorage").value === sessionStorage &&
      Object.getOwnPropertyDescriptor(globalThis, "Storage").value === Storage;
    console.log(JSON.stringify(out));
  `;

  const dataShape = (enumerable: boolean) => ({
    kind: "data",
    hasGet: false,
    hasSet: false,
    writable: true,
    enumerable,
    configurable: true,
  });

  test("localStorage/sessionStorage are enumerable data-shaped, Storage is DontEnum, before and after first read", async () => {
    using dir = tempDir("webstorage-desc", { "descriptors.js": descriptors });
    const file = join(String(dir), "ls.sqlite");
    const out = await runJson(String(dir), [`--localstorage-file=${file}`, "descriptors.js"]);

    expect(out.enumerableBefore).toEqual({ Storage: false, localStorage: true, sessionStorage: true });
    expect(out.inKeysBefore).toEqual({ Storage: false, localStorage: true, sessionStorage: true });

    const expected = {
      Storage: dataShape(false),
      localStorage: dataShape(true),
      sessionStorage: dataShape(true),
    };
    expect(out.firstRead).toEqual(expected);
    expect(out.afterRead).toEqual(expected);
    expect(out.enumerableAfter).toEqual({ Storage: false, localStorage: true, sessionStorage: true });
    expect(out.inKeysAfter).toEqual({ Storage: false, localStorage: true, sessionStorage: true });

    expect(out.types).toEqual({ Storage: "function", localStorage: "object", sessionStorage: "object" });
    expect(out.localIdentity).toBe(true);
    expect(out.sessionIdentity).toBe(true);
    expect(out.storageIdentity).toBe(true);
    expect(out.distinctInstances).toBe(true);
    expect(out.instanceOf).toBe(true);
    expect(out.descriptorValueIsGlobal).toBe(true);
  });

  test("the same shapes hold under --experimental-webstorage without localStorage", async () => {
    using dir = tempDir("webstorage-desc-session", {
      "descriptors.js": `
        const shape = d => ({ kind: "value" in d ? "data" : "accessor", writable: d.writable, enumerable: d.enumerable, configurable: d.configurable });
        console.log(JSON.stringify({
          hasLocal: "localStorage" in globalThis,
          Storage: shape(Object.getOwnPropertyDescriptor(globalThis, "Storage")),
          sessionStorage: shape(Object.getOwnPropertyDescriptor(globalThis, "sessionStorage")),
          instanceOf: sessionStorage instanceof Storage,
          identity: sessionStorage === sessionStorage,
        }));
      `,
    });
    const out = await runJson(String(dir), ["--experimental-webstorage", "descriptors.js"]);
    expect(out.hasLocal).toBe(false);
    expect(out.Storage).toEqual({ kind: "data", writable: true, enumerable: false, configurable: true });
    expect(out.sessionStorage).toEqual({ kind: "data", writable: true, enumerable: true, configurable: true });
    expect(out.instanceOf).toBe(true);
    expect(out.identity).toBe(true);
  });
});

describe.concurrent("web storage gating: assignment, defineProperty and delete", () => {
  test("mutations before the first read stick", async () => {
    using dir = tempDir("webstorage-mutate-before", {
      "mutate.js": `
        const out = {};
        globalThis.localStorage = 1;
        out.assigned = localStorage === 1 && globalThis.localStorage === 1;
        const ld = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
        out.assignedDescriptor = { value: ld.value, writable: ld.writable, enumerable: ld.enumerable, configurable: ld.configurable };

        out.deleted = delete globalThis.sessionStorage;
        out.deletedGone = !("sessionStorage" in globalThis) && typeof sessionStorage === "undefined";

        class Fake {}
        Object.defineProperty(globalThis, "Storage", { value: Fake, configurable: true });
        out.defined = Storage === Fake;
        const sd = Object.getOwnPropertyDescriptor(globalThis, "Storage");
        out.definedDescriptor = { writable: sd.writable, enumerable: sd.enumerable, configurable: sd.configurable };
        console.log(JSON.stringify(out));
      `,
    });
    const file = join(String(dir), "ls.sqlite");
    const out = await runJson(String(dir), [`--localstorage-file=${file}`, "mutate.js"]);
    expect(out.assigned).toBe(true);
    expect(out.assignedDescriptor).toEqual({ value: 1, writable: true, enumerable: true, configurable: true });
    expect(out.deleted).toBe(true);
    expect(out.deletedGone).toBe(true);
    expect(out.defined).toBe(true);
    // Redefining an existing property keeps the attributes the descriptor
    // leaves out, so the installed writable/DontEnum pair survives.
    expect(out.definedDescriptor).toEqual({ writable: true, enumerable: false, configurable: true });
    // Only a storage operation opens the file, and none ran: the assignment
    // replaced the global with a plain value instead of storing through it.
    expect(existsSync(file)).toBe(false);
  });

  test("mutations after the first read behave like plain data properties", async () => {
    using dir = tempDir("webstorage-mutate-after", {
      "mutate.js": `
        const out = {};
        const originalLocal = localStorage;
        const originalSession = sessionStorage;
        const originalStorage = Storage;
        out.read = typeof originalLocal === "object" && typeof originalSession === "object" && typeof originalStorage === "function";

        globalThis.localStorage = 2;
        out.assigned = localStorage === 2;

        out.deleted = delete globalThis.localStorage;
        out.deletedGone = !("localStorage" in globalThis);

        out.deletedSession = delete globalThis.sessionStorage;
        out.deletedSessionGone = !("sessionStorage" in globalThis);

        class Fake {}
        Object.defineProperty(globalThis, "Storage", { value: Fake, configurable: true });
        out.defined = Storage === Fake;
        out.deletedStorage = delete globalThis.Storage;
        out.deletedStorageGone = !("Storage" in globalThis);
        console.log(JSON.stringify(out));
      `,
    });
    const file = join(String(dir), "ls.sqlite");
    const out = await runJson(String(dir), [`--localstorage-file=${file}`, "mutate.js"]);
    expect(out).toEqual({
      read: true,
      assigned: true,
      deleted: true,
      deletedGone: true,
      deletedSession: true,
      deletedSessionGone: true,
      defined: true,
      deletedStorage: true,
      deletedStorageGone: true,
    });
  });

  // Vitest populateGlobal and happy-dom GlobalRegistrator both redefine these
  // keys with a configurable accessor and later delete them. That must work
  // whether or not the lazy getter has already run.
  test("accessor defineProperty + delete, as populateGlobal does, before and after first read", async () => {
    using dir = tempDir("webstorage-populate-global", {
      "populate.js": `
        const names = ${JSON.stringify(NAMES)};
        const win = { Storage: class {}, localStorage: { fake: true }, sessionStorage: { fake: true } };
        const populate = () => {
          for (const key of names) {
            Object.defineProperty(globalThis, key, {
              get: () => win[key],
              set: v => { win[key] = v; },
              configurable: true,
            });
          }
        };
        const out = {};
        if (process.env.WS_READ_FIRST === "1") {
          out.readFirst = typeof Storage === "function" && typeof localStorage === "object" && typeof sessionStorage === "object";
        }
        populate();
        out.populated = names.every(n => globalThis[n] === win[n]);
        out.accessorShape = names.every(n => {
          const d = Object.getOwnPropertyDescriptor(globalThis, n);
          return typeof d.get === "function" && typeof d.set === "function" && d.configurable === true;
        });
        out.deleted = names.every(n => delete globalThis[n]);
        out.gone = names.every(n => !(n in globalThis));
        console.log(JSON.stringify(out));
      `,
    });
    const file = join(String(dir), "ls.sqlite");
    const before = await runJson(String(dir), [`--localstorage-file=${file}`, "populate.js"]);
    expect(before).toEqual({ populated: true, accessorShape: true, deleted: true, gone: true });
    const after = await runJson(String(dir), [`--localstorage-file=${file}`, "populate.js"], { WS_READ_FIRST: "1" });
    expect(after).toEqual({ readFirst: true, populated: true, accessorShape: true, deleted: true, gone: true });
  });
});

describe.concurrent("web storage gating: Workers", () => {
  const workerFixture = {
    "main.js": `
      localStorage.setItem("fromMain", "1");
      sessionStorage.setItem("s", "main");
      const worker = new Worker(new URL("./worker.js", import.meta.url).href);
      worker.onerror = e => {
        console.error("worker error", e.message);
        process.exit(2);
      };
      worker.onmessage = e => {
        const out = e.data;
        out.mainSeesWorkerWrite = localStorage.getItem("fromWorker");
        out.mainSessionUntouched = sessionStorage.getItem("s") === "main" && sessionStorage.length === 1;
        console.log(JSON.stringify(out));
        worker.terminate();
      };
    `,
    "worker.js": `
      const out = {
        storageType: typeof Storage,
        localType: typeof localStorage,
        sessionType: typeof sessionStorage,
        localFromMain: typeof localStorage === "object" ? localStorage.getItem("fromMain") : null,
        sessionLength: typeof sessionStorage === "object" ? sessionStorage.length : null,
        sessionFromMain: typeof sessionStorage === "object" ? sessionStorage.getItem("s") : null,
        instanceOf: typeof Storage === "function" && localStorage instanceof Storage && sessionStorage instanceof Storage,
      };
      if (typeof localStorage === "object") {
        localStorage.setItem("fromWorker", "2");
        sessionStorage.setItem("s", "worker");
      }
      postMessage(out);
    `,
  };

  test("with --localstorage-file a Worker shares localStorage and has its own empty sessionStorage", async () => {
    using dir = tempDir("webstorage-worker-on", workerFixture);
    const file = join(String(dir), "ls.sqlite");
    const out = await runJson(String(dir), [`--localstorage-file=${file}`, "main.js"]);
    expect(out).toEqual({
      storageType: "function",
      localType: "object",
      sessionType: "object",
      localFromMain: "1",
      sessionLength: 0,
      sessionFromMain: null,
      instanceOf: true,
      mainSeesWorkerWrite: "2",
      mainSessionUntouched: true,
    });
  });

  test("without flags a Worker has none of the globals", async () => {
    using dir = tempDir("webstorage-worker-off", {
      "main.js": `
        const worker = new Worker(new URL("./worker.js", import.meta.url).href);
        worker.onerror = e => {
          console.error("worker error", e.message);
          process.exit(2);
        };
        worker.onmessage = e => {
          console.log(JSON.stringify(e.data));
          worker.terminate();
        };
      `,
      "worker.js": `
        postMessage({
          Storage: "Storage" in globalThis,
          localStorage: "localStorage" in globalThis,
          sessionStorage: "sessionStorage" in globalThis,
        });
      `,
    });
    const out = await runJson(String(dir), ["main.js"]);
    expect(out).toEqual(absent);
  });
});

describe.concurrent("web storage gating: bun test --isolate", () => {
  // File order on the command line is the run order; the first file writes
  // and the second observes, the same arrangement as test/cli/test/isolation.test.ts.
  const fixtures = {
    "a-writer.test.ts": `
      import { test, expect } from "bun:test";
      test("write", () => {
        sessionStorage.setItem("leak", "1");
        localStorage.setItem("persist", "1");
        expect(sessionStorage.length).toBe(1);
      });
    `,
    "b-observer.test.ts": `
      import { test, expect } from "bun:test";
      test("observe", () => {
        expect(localStorage.getItem("persist")).toBe("1");
        if (process.env.WS_EXPECT_ISOLATED === "1") {
          expect(sessionStorage.getItem("leak")).toBeNull();
          expect(sessionStorage.length).toBe(0);
        } else {
          expect(sessionStorage.getItem("leak")).toBe("1");
        }
      });
    `,
  };
  const files = ["./a-writer.test.ts", "./b-observer.test.ts"];

  test("with --isolate, sessionStorage is fresh per file while localStorage persists", async () => {
    using dir = tempDir("webstorage-isolate-on", fixtures);
    const file = join(String(dir), "ls.sqlite");
    const { stderr, exitCode } = await run(
      String(dir),
      ["test", "--isolate", `--localstorage-file=${file}`, ...files],
      {
        WS_EXPECT_ISOLATED: "1",
      },
    );
    const normalized = normalizeBunSnapshot(stderr, String(dir));
    expect(normalized).toContain("2 pass");
    expect(normalized).toContain("0 fail");
    expect(exitCode).toBe(0);
  });

  test("without --isolate, sessionStorage carries across files in the shared global", async () => {
    using dir = tempDir("webstorage-isolate-off", fixtures);
    const file = join(String(dir), "ls.sqlite");
    const { stderr, exitCode } = await run(String(dir), ["test", `--localstorage-file=${file}`, ...files], {
      WS_EXPECT_ISOLATED: "0",
    });
    const normalized = normalizeBunSnapshot(stderr, String(dir));
    expect(normalized).toContain("2 pass");
    expect(normalized).toContain("0 fail");
    expect(exitCode).toBe(0);
  });

  test("bun test without the flag has no storage globals", async () => {
    using dir = tempDir("webstorage-test-off", {
      "absent.test.ts": `
        import { test, expect } from "bun:test";
        test("absent", () => {
          expect("Storage" in globalThis).toBe(false);
          expect("localStorage" in globalThis).toBe(false);
          expect("sessionStorage" in globalThis).toBe(false);
        });
      `,
    });
    const { stderr, exitCode } = await run(String(dir), ["test", "./absent.test.ts"]);
    const normalized = normalizeBunSnapshot(stderr, String(dir));
    expect(normalized).toContain("1 pass");
    expect(normalized).toContain("0 fail");
    expect(exitCode).toBe(0);
  });
});
