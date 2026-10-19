import { describe, expect, test } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";
import { join } from "node:path";

// Both DOM packages live in test/node_modules, but the fixtures run from temp
// dirs, so they import them by the absolute paths resolved from this file.
const JSDOM_PATH = require.resolve("jsdom");
const REGISTRATOR_PATH = require.resolve("@happy-dom/global-registrator");

// getWindowKeys, isClassLikeName and populateGlobal are copied verbatim from
// vitest@3.2.6 dist/chunks/index.CmSc2RE5.js:240-296. KEYS is cut down to the
// members that decide Web Storage: Vitest always overrides these two names and
// skips any other window key that is already on the global.
const VITEST_FIXTURE = `
import { JSDOM } from ${JSON.stringify(JSDOM_PATH)};

const KEYS = ["Storage", "StorageEvent"];

const skipKeys = [
	"window",
	"self",
	"top",
	"parent"
];
function getWindowKeys(global, win, additionalKeys = []) {
	const keysArray = [...additionalKeys, ...KEYS];
	const keys = new Set(keysArray.concat(Object.getOwnPropertyNames(win)).filter((k) => {
		if (skipKeys.includes(k)) return false;
		if (k in global) return keysArray.includes(k);
		return true;
	}));
	return keys;
}
function isClassLikeName(name) {
	return name[0] === name[0].toUpperCase();
}
function populateGlobal(global, win, options = {}) {
	const { bindFunctions = false } = options;
	const keys = getWindowKeys(global, win, options.additionalKeys);
	const originals = /* @__PURE__ */ new Map();
	const overrideObject = /* @__PURE__ */ new Map();
	for (const key of keys) {
		const boundFunction = bindFunctions && typeof win[key] === "function" && !isClassLikeName(key) && win[key].bind(win);
		if (KEYS.includes(key) && key in global) originals.set(key, global[key]);
		Object.defineProperty(global, key, {
			get() {
				if (overrideObject.has(key)) return overrideObject.get(key);
				if (boundFunction) return boundFunction;
				return win[key];
			},
			set(v) {
				overrideObject.set(key, v);
			},
			configurable: true
		});
	}
	global.window = global;
	global.self = global;
	global.top = global;
	global.parent = global;
	if (global.global) global.global = global;
	// rewrite defaultView to reference the same global context
	if (global.document && global.document.defaultView) Object.defineProperty(global.document, "defaultView", {
		get: () => global,
		enumerable: true,
		configurable: true
	});
	skipKeys.forEach((k) => keys.add(k));
	return {
		keys,
		skipKeys,
		originals
	};
}

// Vitest's jsdom environment passes a non-opaque url; without one jsdom's
// localStorage getter throws SecurityError.
const win = new JSDOM("", { url: "http://localhost:3000/" }).window;
const names = ["Storage", "localStorage", "sessionStorage"];
const before = Object.fromEntries(names.map(k => [k, k in globalThis]));
const { keys } = populateGlobal(globalThis, win);
globalThis.localStorage.setItem("k", "v");
console.log(JSON.stringify({
  before,
  selected: names.filter(k => keys.has(k)),
  storageIsJsdom: globalThis.Storage === win.Storage,
  localStorageIsJsdom: globalThis.localStorage === win.localStorage,
  sessionStorageIsJsdom: globalThis.sessionStorage === win.sessionStorage,
  instanceOfStorage: globalThis.localStorage instanceof globalThis.Storage,
  tag: Object.prototype.toString.call(globalThis.localStorage),
  jsdomValue: win.localStorage.getItem("k"),
  globalValue: globalThis.localStorage.getItem("k"),
}));
`;

const REGISTRATOR_PRELOAD = `
import { GlobalRegistrator } from ${JSON.stringify(REGISTRATOR_PATH)};
globalThis.__webstorageBefore = {
  Storage: "Storage" in globalThis,
  localStorage: "localStorage" in globalThis,
  sessionStorage: "sessionStorage" in globalThis,
};
// Reading the globals here loads the runtime's module but opens no SQLite file;
// the test needs the instances to prove register() replaced rather than kept them.
globalThis.__runtimeStorage = "Storage" in globalThis ? globalThis.Storage : undefined;
globalThis.__runtimeLocalStorage = "localStorage" in globalThis ? globalThis.localStorage : undefined;
globalThis.__runtimeSessionStorage = "sessionStorage" in globalThis ? globalThis.sessionStorage : undefined;
GlobalRegistrator.register();
`;

const REGISTRATOR_TEST = `
import { expect, test } from "bun:test";
const present = process.env.WEBSTORAGE_EXPECT_PRESENT === "1";
test("happy-dom owns the storage globals", () => {
  expect(globalThis.__webstorageBefore).toEqual({ Storage: present, localStorage: present, sessionStorage: present });
  expect(typeof Storage).toBe("function");
  expect(localStorage).toBeInstanceOf(Storage);
  expect(sessionStorage).toBeInstanceOf(Storage);
  expect(localStorage.constructor).toBe(Storage);
  if (present) {
    expect(typeof globalThis.__runtimeStorage).toBe("function");
    expect(typeof globalThis.__runtimeLocalStorage).toBe("object");
    expect(typeof globalThis.__runtimeSessionStorage).toBe("object");
    expect(Storage).not.toBe(globalThis.__runtimeStorage);
    expect(localStorage).not.toBe(globalThis.__runtimeLocalStorage);
    expect(sessionStorage).not.toBe(globalThis.__runtimeSessionStorage);
  }
  localStorage.setItem("k", "v");
  expect(localStorage.getItem("k")).toBe("v");
  for (const name of ["Storage", "localStorage", "sessionStorage"]) {
    expect(Object.getOwnPropertyDescriptor(globalThis, name)?.configurable).toBe(true);
  }
});
`;

async function run(cmd: string[], cwd: string, env: Record<string, string> = {}) {
  await using proc = Bun.spawn({
    cmd,
    cwd,
    env: { ...bunEnv, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  return { stdout, stderr, exitCode };
}

function lastJsonLine(stdout: string) {
  const lines = stdout.trim().split("\n");
  return JSON.parse(lines[lines.length - 1]);
}

// Each child imports jsdom, which alone takes about 25 s on an ASAN debug build under load.
describe("Vitest 3.2.6 populateGlobal with jsdom", () => {
  test("without flags it installs jsdom's Storage, localStorage and sessionStorage", async () => {
    using dir = tempDir("webstorage-vitest", { "fixture.mjs": VITEST_FIXTURE });
    const { stdout, stderr, exitCode } = await run([bunExe(), "fixture.mjs"], String(dir));
    expect(stderr).toBe("");
    expect(exitCode).toBe(0);
    expect(lastJsonLine(stdout)).toEqual({
      before: { Storage: false, localStorage: false, sessionStorage: false },
      selected: ["Storage", "localStorage", "sessionStorage"],
      storageIsJsdom: true,
      localStorageIsJsdom: true,
      sessionStorageIsJsdom: true,
      instanceOfStorage: true,
      tag: "[object Storage]",
      jsdomValue: "v",
      globalValue: "v",
    });
  }, 120_000);

  // Vitest skips any present key outside its own list, so under the flag the
  // runtime's instances stay while Storage is swapped for jsdom's. That makes
  // `localStorage instanceof Storage` false: a documented interaction, and the
  // reason not to pass the flag to DOM test runs.
  test("with --localstorage-file it does not throw and keeps the runtime's instances", async () => {
    using dir = tempDir("webstorage-vitest-flag", { "fixture.mjs": VITEST_FIXTURE });
    const { stdout, stderr, exitCode } = await run(
      [bunExe(), "--localstorage-file", join(String(dir), "local.sqlite"), "fixture.mjs"],
      String(dir),
    );
    expect(stderr).toBe("");
    expect(exitCode).toBe(0);
    expect(lastJsonLine(stdout)).toEqual({
      before: { Storage: true, localStorage: true, sessionStorage: true },
      selected: ["Storage"],
      storageIsJsdom: true,
      localStorageIsJsdom: false,
      sessionStorageIsJsdom: false,
      instanceOfStorage: false,
      tag: "[object Storage]",
      jsdomValue: null,
      globalValue: "v",
    });
  }, 120_000);
});

describe("happy-dom GlobalRegistrator preload under bun test", () => {
  const files = { "preload.ts": REGISTRATOR_PRELOAD, "dom.test.ts": REGISTRATOR_TEST };

  test("without flags it installs happy-dom's storage", async () => {
    using dir = tempDir("webstorage-registrator", files);
    const { stdout, stderr, exitCode } = await run(
      [bunExe(), "test", "--preload", "./preload.ts", "./dom.test.ts"],
      String(dir),
      { WEBSTORAGE_EXPECT_PRESENT: "0" },
    );
    expect(stdout + stderr).toContain(" 1 pass");
    expect(exitCode).toBe(0);
  }, 30_000);

  // GlobalRegistrator redefines every window key whose value differs, so unlike
  // Vitest it replaces the runtime's instances as long as they are configurable.
  test("with --localstorage-file register() does not throw and happy-dom's storage wins", async () => {
    using dir = tempDir("webstorage-registrator-flag", files);
    const { stdout, stderr, exitCode } = await run(
      [
        bunExe(),
        "test",
        "--localstorage-file",
        join(String(dir), "local.sqlite"),
        "--preload",
        "./preload.ts",
        "./dom.test.ts",
      ],
      String(dir),
      { WEBSTORAGE_EXPECT_PRESENT: "1" },
    );
    expect(stdout + stderr).toContain(" 1 pass");
    expect(exitCode).toBe(0);
  }, 30_000);
});
