import { beforeEach, describe, expect, test } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";
import { join } from "node:path";

const g = globalThis as any;
const INNER_ENV = "WEBSTORAGE_TEST_INNER";
const FILE_ENV = "WEBSTORAGE_TEST_FILE";

const enabled = typeof g.Storage === "function" && "localStorage" in g && "sessionStorage" in g;

if (!enabled && process.env[INNER_ENV]) {
  throw new Error(
    "--localstorage-file was passed but Storage, localStorage and sessionStorage are not installed on globalThis",
  );
}

if (!enabled) {
  // Web Storage is opt-in, so this file re-runs itself under the flag instead of
  // making every test below spawn its own child process.
  test("runs the suite under --localstorage-file", async () => {
    // The quota tests leave 10 MiB rows behind, so the file must not outlive the test.
    using dir = tempDir("webstorage", {});
    const file = join(String(dir), "local.sqlite");
    await using proc = Bun.spawn({
      cmd: [bunExe(), "test", "--localstorage-file", file, import.meta.path],
      env: { ...bunEnv, [INNER_ENV]: "1", [FILE_ENV]: file },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    const output = stdout + stderr;
    // " 0 fail" alone is also what a run that registered no tests prints.
    expect(output).toMatch(/\b[1-9]\d* pass\b/);
    expect(output).toContain(" 0 fail");
    expect(exitCode).toBe(0);
  }, 180_000);
} else {
  suite();
}

function suite() {
  const Storage = g.Storage;
  const QUOTA = 10 * 1024 * 1024;
  // Code units a one-character key leaves for its value: (1 + MAX_VALUE) * 2 === QUOTA.
  const MAX_VALUE = QUOTA / 2 - 1;

  function thrown(fn: () => unknown): any {
    try {
      fn();
    } catch (e) {
      return e;
    }
    throw new Error("expected the callback to throw");
  }

  function keysOf(storage: any): (string | null)[] {
    return Array.from({ length: storage.length }, (_, i) => storage.key(i));
  }

  describe("Storage interface", () => {
    const { localStorage, sessionStorage } = g;

    // The quota tests leave keys in the file, so a second run against the same
    // --localstorage-file must not depend on this describe seeing it empty.
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    test("cannot be constructed or called", () => {
      const constructed = thrown(() => new Storage());
      expect(constructed).toBeInstanceOf(TypeError);
      expect(constructed.code).toBe("ERR_ILLEGAL_CONSTRUCTOR");
      // Calling a class without `new` is the engine's own TypeError, with no code, as in Node.
      expect(thrown(() => Storage())).toBeInstanceOf(TypeError);
    });

    test("has the WebIDL shape", () => {
      expect(Storage.length).toBe(0);
      expect(Storage.name).toBe("Storage");
      const lengths = { key: 1, getItem: 1, setItem: 2, removeItem: 1, clear: 0 };
      for (const [name, length] of Object.entries(lengths)) {
        const d = Object.getOwnPropertyDescriptor(Storage.prototype, name)!;
        expect(typeof d.value).toBe("function");
        expect(d.value.length).toBe(length);
        expect(d.enumerable).toBe(true);
      }
      const length = Object.getOwnPropertyDescriptor(Storage.prototype, "length")!;
      expect(typeof length.get).toBe("function");
      expect(length.set).toBeUndefined();
      expect(length.enumerable).toBe(true);
      expect(Storage.prototype[Symbol.toStringTag]).toBe("Storage");
    });

    test("instances are branded Storage objects", () => {
      for (const storage of [localStorage, sessionStorage]) {
        expect(storage).toBeInstanceOf(Storage);
        expect(Object.getPrototypeOf(storage)).toBe(Storage.prototype);
        expect(Object.prototype.toString.call(storage)).toBe("[object Storage]");
        expect(Object.hasOwn(storage, "length")).toBe(false);
      }
      expect(localStorage).not.toBe(sessionStorage);
    });

    test("localStorage and sessionStorage are separate areas", () => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("only-local", "1");
      sessionStorage.setItem("only-session", "2");
      expect(sessionStorage.getItem("only-local")).toBeNull();
      expect(localStorage.getItem("only-session")).toBeNull();
      expect(localStorage.length).toBe(1);
      expect(sessionStorage.length).toBe(1);
      localStorage.clear();
      sessionStorage.clear();
    });

    test("methods reject a foreign this", () => {
      const foreign = [{}, Object.create(Storage.prototype), Storage.prototype, null];
      for (const name of ["key", "getItem", "setItem", "removeItem", "clear"]) {
        for (const receiver of foreign) {
          const e = thrown(() => Storage.prototype[name].call(receiver, "a", "b"));
          expect(e).toBeInstanceOf(TypeError);
          expect(e.code).toBe("ERR_INVALID_THIS");
        }
      }
      const lengthGetter = Object.getOwnPropertyDescriptor(Storage.prototype, "length")!.get!;
      const e = thrown(() => lengthGetter.call({}));
      expect(e).toBeInstanceOf(TypeError);
      expect(e.code).toBe("ERR_INVALID_THIS");
    });

    test("missing arguments throw ERR_MISSING_ARGS", () => {
      const calls = [
        () => localStorage.getItem(),
        () => localStorage.removeItem(),
        () => localStorage.key(),
        () => localStorage.setItem(),
        () => localStorage.setItem("a"),
      ];
      for (const call of calls) {
        const e = thrown(call);
        expect(e).toBeInstanceOf(TypeError);
        expect(e.code).toBe("ERR_MISSING_ARGS");
      }
      expect(localStorage.length).toBe(0);
    });
  });

  describe.each(["localStorage", "sessionStorage"])("%s", name => {
    const storage = g[name];

    beforeEach(() => {
      storage.clear();
    });

    test("getItem returns null for an absent key", () => {
      expect(storage.getItem("missing")).toBeNull();
      expect(storage.key(0)).toBeNull();
      expect(storage.length).toBe(0);
    });

    test("setItem stores, getItem reads and overwrites replace", () => {
      expect(storage.setItem("a", "1")).toBeUndefined();
      expect(storage.getItem("a")).toBe("1");
      expect(storage.length).toBe(1);
      storage.setItem("a", "2");
      expect(storage.getItem("a")).toBe("2");
      expect(storage.length).toBe(1);
      expect(storage.removeItem("a")).toBeUndefined();
      expect(storage.clear()).toBeUndefined();
    });

    test("keys and values go through ToString", () => {
      storage.setItem("n", 1);
      storage.setItem("nul", null);
      storage.setItem("u", undefined);
      storage.setItem("o", {});
      storage.setItem("t", {
        toString() {
          return "custom";
        },
      });
      expect(storage.getItem("n")).toBe("1");
      expect(storage.getItem("nul")).toBe("null");
      expect(storage.getItem("u")).toBe("undefined");
      expect(storage.getItem("o")).toBe("[object Object]");
      expect(storage.getItem("t")).toBe("custom");

      storage.setItem(1, "one");
      storage.setItem(undefined, "from-undefined");
      storage.setItem({ toString: () => "obj" }, "from-object");
      expect(storage.getItem("1")).toBe("one");
      expect(storage.getItem(1)).toBe("one");
      expect(storage.getItem("undefined")).toBe("from-undefined");
      expect(storage.getItem("obj")).toBe("from-object");
    });

    test("Symbol keys and values throw TypeError and store nothing", () => {
      const sym = Symbol("s");
      const calls = [
        () => storage.setItem(sym, "v"),
        () => storage.setItem("k", sym),
        () => storage.getItem(sym),
        () => storage.removeItem(sym),
        () => storage.key(sym),
        () => {
          storage.k = sym;
        },
      ];
      for (const call of calls) {
        expect(thrown(call)).toBeInstanceOf(TypeError);
      }
      expect(storage.length).toBe(0);
    });

    test("key() applies ToUint32", () => {
      storage.setItem("k0", "0");
      storage.setItem("k1", "1");
      storage.setItem("k2", "2");
      expect(storage.key(0)).toBe("k0");
      expect(storage.key(1.9)).toBe("k1");
      expect(storage.key("1")).toBe("k1");
      expect(storage.key(2 ** 32)).toBe("k0");
      expect(storage.key(2 ** 32 + 2)).toBe("k2");
      expect(storage.key("x")).toBe("k0");
      expect(storage.key(null)).toBe("k0");
      expect(storage.key(undefined)).toBe("k0");
      expect(storage.key(-1)).toBeNull();
      expect(storage.key(3)).toBeNull();
    });

    test("keys keep insertion order", () => {
      storage.setItem("a", "1");
      storage.setItem("b", "2");
      storage.setItem("c", "3");
      expect(keysOf(storage)).toEqual(["a", "b", "c"]);
      storage.setItem("a", "overwritten");
      expect(keysOf(storage)).toEqual(["a", "b", "c"]);
      storage.removeItem("a");
      storage.setItem("a", "again");
      expect(keysOf(storage)).toEqual(["b", "c", "a"]);
    });

    test("removeItem and clear tolerate absent keys and empty stores", () => {
      expect(storage.removeItem("absent")).toBeUndefined();
      expect(storage.clear()).toBeUndefined();
      expect(storage.length).toBe(0);
      storage.setItem("a", "1");
      storage.removeItem("absent");
      expect(storage.length).toBe(1);
      storage.clear();
      expect(storage.length).toBe(0);
      expect(storage.getItem("a")).toBeNull();
    });

    test("lone surrogates and NUL survive in keys and values", () => {
      storage.setItem("\ud800", "lone");
      storage.setItem("nul", "a\0b");
      storage.setItem("k\0", "\udc00");
      expect(storage.getItem("\ud800")).toBe("lone");
      expect(storage.getItem("nul")).toBe("a\0b");
      expect(storage.getItem("k\0")).toBe("\udc00");
      expect(keysOf(storage)).toEqual(["\ud800", "nul", "k\0"]);
      expect("\ud800" in storage).toBe(true);
      expect(storage["k\0"]).toBe("\udc00");
    });

    if (name === "localStorage") {
      test("lone surrogates and NUL survive a fresh process", () => {
        const file = process.env[FILE_ENV];
        if (!file) throw new Error(`${FILE_ENV} must name the --localstorage-file path`);
        storage.setItem("\ud800", "lone\0");
        storage.setItem("nul\0", "\udc00");

        using dir = tempDir("webstorage-reader", {
          "read.js": `console.log(JSON.stringify([
            localStorage.length,
            localStorage.key(0),
            localStorage.getItem("\\ud800"),
            localStorage.key(1),
            localStorage.getItem("nul\\0"),
          ]));`,
        });
        const { stdout, stderr, exitCode } = Bun.spawnSync({
          cmd: [bunExe(), "--localstorage-file", file, join(String(dir), "read.js")],
          env: bunEnv,
        });
        expect(stderr.toString()).toBe("");
        expect(exitCode).toBe(0);
        expect(JSON.parse(stdout.toString())).toEqual([2, "\ud800", "lone\0", "nul\0", "\udc00"]);
      });
    }

    describe("named properties", () => {
      test("a stored key is an own enumerable data property", () => {
        storage.setItem("foo", "x");
        expect(storage.foo).toBe("x");
        expect("foo" in storage).toBe(true);
        expect(Object.hasOwn(storage, "foo")).toBe(true);
        expect(storage.hasOwnProperty("foo")).toBe(true);
        expect(Object.getOwnPropertyDescriptor(storage, "foo")).toEqual({
          value: "x",
          writable: true,
          enumerable: true,
          configurable: true,
        });
        expect("bar" in storage).toBe(false);
        expect(Object.hasOwn(storage, "bar")).toBe(false);
        expect(storage.bar).toBeUndefined();
        expect("getItem" in storage).toBe(true);
      });

      test("assignment stores through the named setter", () => {
        storage.foo = 1;
        expect(storage.getItem("foo")).toBe("1");
        storage.foo = "y";
        expect(storage.getItem("foo")).toBe("y");
        expect(storage.length).toBe(1);
      });

      test("prototype names win on get but still store", () => {
        storage.setItem("getItem", "x");
        expect(typeof storage.getItem).toBe("function");
        expect(Storage.prototype.getItem.call(storage, "getItem")).toBe("x");
        expect(Object.hasOwn(storage, "getItem")).toBe(false);
        expect(Object.keys(storage)).toEqual([]);
        expect(storage.length).toBe(1);

        storage.setItem("length", "L");
        expect(typeof storage.length).toBe("number");
        expect(storage.length).toBe(2);
        expect(storage.getItem("length")).toBe("L");

        storage.getItem = 5;
        expect(typeof storage.getItem).toBe("function");
        expect(Storage.prototype.getItem.call(storage, "getItem")).toBe("5");

        storage.toString = "t";
        expect(typeof storage.toString).toBe("function");
        expect(storage.getItem("toString")).toBe("t");
        expect(storage.length).toBe(3);
      });

      test("defineProperty stores data descriptors and rejects accessors", () => {
        Object.defineProperty(storage, "q", { value: 3, writable: true, enumerable: true, configurable: true });
        expect(storage.getItem("q")).toBe("3");
        expect(() =>
          Object.defineProperty(storage, "acc", {
            get() {
              return 1;
            },
            configurable: true,
          }),
        ).toThrow(TypeError);
        expect(storage.getItem("acc")).toBeNull();
        expect(storage.length).toBe(1);
      });

      test("delete removes visible items and leaves prototype names alone", () => {
        storage.setItem("foo", "x");
        storage.setItem("getItem", "hidden");
        expect(delete storage.foo).toBe(true);
        expect(storage.getItem("foo")).toBeNull();
        expect("foo" in storage).toBe(false);
        expect(delete storage.getItem).toBe(true);
        expect(typeof storage.getItem).toBe("function");
        expect(Storage.prototype.getItem.call(storage, "getItem")).toBe("hidden");
        expect(delete storage.absent).toBe(true);
        expect(storage.length).toBe(1);
      });

      test("preventExtensions, seal and freeze throw", () => {
        storage.setItem("a", "1");
        expect(() => Object.preventExtensions(storage)).toThrow(TypeError);
        expect(() => Object.seal(storage)).toThrow(TypeError);
        expect(() => Object.freeze(storage)).toThrow(TypeError);
        expect(Object.isExtensible(storage)).toBe(true);
        expect(Object.isFrozen(storage)).toBe(false);
        storage.setItem("b", "2");
        expect(storage.length).toBe(2);
      });

      test("symbol properties never reach the store", () => {
        const sym = Symbol("s");
        storage[sym] = 1;
        expect(storage[sym]).toBe(1);
        expect(Object.getOwnPropertySymbols(storage)).toContain(sym);
        expect(storage.length).toBe(0);
        expect(Object.keys(storage)).toEqual([]);
        expect(delete storage[sym]).toBe(true);
        expect(Object.getOwnPropertySymbols(storage)).not.toContain(sym);
      });

      test("objects inheriting from a storage define on themselves", () => {
        const child = Object.create(storage);
        child.bar = 1;
        expect(child.bar).toBe(1);
        expect(Object.hasOwn(child, "bar")).toBe(true);
        expect(storage.getItem("bar")).toBeNull();
        expect("bar" in storage).toBe(false);
        expect(storage.length).toBe(0);
        storage.setItem("inherited", "v");
        expect(child.inherited).toBe("v");
      });

      test("enumeration follows key() order without hoisting numeric names", () => {
        storage.setItem("b", "1");
        storage.setItem("1", "2");
        storage.setItem("a", "3");
        const order = ["b", "1", "a"];
        expect(keysOf(storage)).toEqual(order);
        expect(Object.keys(storage)).toEqual(order);
        expect(Object.getOwnPropertyNames(storage)).toEqual(order);
        expect(Reflect.ownKeys(storage).filter(k => typeof k === "string")).toEqual(order);
        const forIn: string[] = [];
        for (const k in storage) forIn.push(k);
        expect(forIn.slice(0, order.length)).toEqual(order);
        expect(Object.entries(storage)).toEqual([
          ["b", "1"],
          ["1", "2"],
          ["a", "3"],
        ]);
        expect({ ...storage }).toEqual({ b: "1", "1": "2", a: "3" });
      });
    });

    test("structuredClone rejects a storage", () => {
      const e = thrown(() => structuredClone(storage));
      expect(e).toBeInstanceOf(DOMException);
      expect(e.name).toBe("DataCloneError");
      expect(e.code).toBe(25);
    });

    describe("quota", () => {
      function expectQuotaError(e: any) {
        expect(e).toBeInstanceOf(DOMException);
        expect(e.name).toBe("QuotaExceededError");
        expect(e.code).toBe(22);
        expect(e.message).toBe("Setting the value exceeded the quota");
      }

      test("holds 10 MiB of UTF-16 code units", () => {
        storage.setItem("k", "x".repeat(MAX_VALUE));
        expect(storage.length).toBe(1);
        expect(storage.getItem("k")!.length).toBe(MAX_VALUE);
        storage.clear();
        expectQuotaError(thrown(() => storage.setItem("k", "x".repeat(MAX_VALUE + 1))));
        expect(storage.length).toBe(0);
        expect(storage.getItem("k")).toBeNull();
      }, 30_000);

      test("charges the key as well as the value", () => {
        expectQuotaError(thrown(() => storage.setItem("kk", "x".repeat(MAX_VALUE))));
        storage.setItem("kk", "x".repeat(MAX_VALUE - 1));
        expect(storage.length).toBe(1);
      }, 30_000);

      test("counts across keys", () => {
        storage.setItem("a", "x".repeat(MAX_VALUE - 10));
        storage.setItem("b", "x".repeat(5));
        expectQuotaError(thrown(() => storage.setItem("c", "x".repeat(5))));
        storage.setItem("c", "x".repeat(3));
        expect(keysOf(storage)).toEqual(["a", "b", "c"]);
      }, 30_000);

      test("charges an overwrite the net difference and keeps the old value on failure", () => {
        const full = "a".repeat(MAX_VALUE);
        storage.setItem("k", full);
        expectQuotaError(thrown(() => storage.setItem("k", "b".repeat(MAX_VALUE + 1))));
        expect(storage.getItem("k") === full).toBe(true);
        expect(storage.length).toBe(1);

        storage.setItem("k", "b".repeat(MAX_VALUE));
        expect(storage.getItem("k")!.at(-1)).toBe("b");
        storage.setItem("k", "short");
        storage.setItem("j", "y".repeat(1000));
        expect(storage.length).toBe(2);
      }, 30_000);

      test("counts code units, not UTF-8 bytes", () => {
        storage.setItem("k", "é".repeat(MAX_VALUE));
        expect(storage.getItem("k")!.length).toBe(MAX_VALUE);
        storage.clear();
        expectQuotaError(thrown(() => storage.setItem("k", "é".repeat(MAX_VALUE + 1))));
        expect(storage.length).toBe(0);
      }, 30_000);

      test("rejects even an empty value once full", () => {
        storage.setItem("k", "x".repeat(MAX_VALUE));
        expectQuotaError(thrown(() => storage.setItem("j", "")));
        expect(storage.getItem("j")).toBeNull();
        expect(storage.length).toBe(1);
        // Re-setting the identical value is a no-op rather than a quota failure.
        storage.setItem("k", "x".repeat(MAX_VALUE));
        storage.removeItem("k");
        storage.setItem("j", "");
        expect(storage.getItem("j")).toBe("");
      }, 30_000);
    });
  });
}
