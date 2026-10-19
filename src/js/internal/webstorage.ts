// Web Storage: the Storage interface plus the localStorage and sessionStorage
// instances. ZigGlobalObject.cpp installs the globals lazily when the CLI
// enables Web Storage and calls the factories exported below on first access.
// localStorage is one SQLite file shared by every process and thread that was
// given the same --localstorage-file; sessionStorage is a ':memory:' database
// per global object. Both go through Area so order, quota and surrogate
// handling cannot drift between them.
import type * as BunSQLiteModule from "bun:sqlite";

const ObjectCreate = Object.create;
const ObjectDefineProperty = Object.defineProperty;
const ReflectDefineProperty = Reflect.defineProperty;
const ReflectDeleteProperty = Reflect.deleteProperty;
const ReflectGet = Reflect.get;
const ReflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
const ReflectHas = Reflect.has;
const ReflectOwnKeys = Reflect.ownKeys;
const ReflectSet = Reflect.set;
const NativeDOMException = DOMException;
const NativeProxy = Proxy;

// Node's limit: key and value UTF-16 code units, two bytes each.
const QUOTA_BYTES = 10 * 1024 * 1024;

let sqlite: typeof BunSQLiteModule;

function openDatabase(path: string): BunSQLiteModule.Database {
  // Builtins cannot resolve the "bun:sqlite" literal; sql/sqlite.ts requires the source file the same way.
  sqlite ??= require("../bun/sqlite.ts");
  try {
    return new sqlite.Database(path);
  } catch (cause) {
    // Node parity: a bad --localstorage-file path surfaces on the first operation, not when the global is read.
    const error = $ERR_INVALID_STATE("unable to open database file");
    ObjectDefineProperty(error, "cause", { __proto__: null, value: cause, writable: true, configurable: true });
    throw error;
  }
}

// DOMString, not USVString: lone surrogates and NUL must round-trip, and bun:sqlite decodes TEXT as UTF-8
// with replacement. UTF-16LE BLOBs through Buffer keep every code unit intact.
function encode(text: string): Buffer {
  return Buffer.from(text, "utf16le");
}

function decode(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("utf16le");
}

type Row<T> = T | null;

class Area {
  #path: string;
  #db: BunSQLiteModule.Database | undefined;
  #begin!: BunSQLiteModule.Statement;
  #commit!: BunSQLiteModule.Statement;
  #rollback!: BunSQLiteModule.Statement;
  #get!: BunSQLiteModule.Statement;
  #has!: BunSQLiteModule.Statement;
  #upsert!: BunSQLiteModule.Statement;
  #delete!: BunSQLiteModule.Statement;
  #deleteAll!: BunSQLiteModule.Statement;
  #count!: BunSQLiteModule.Statement;
  #keyAt!: BunSQLiteModule.Statement;
  #keys!: BunSQLiteModule.Statement;
  #total!: BunSQLiteModule.Statement;
  #addTotal!: BunSQLiteModule.Statement;
  #setTotal!: BunSQLiteModule.Statement;

  constructor(path: string) {
    this.#path = path;
  }

  #open(): void {
    if (this.#db !== undefined) return;
    const db = openDatabase(this.#path);
    try {
      db.run("PRAGMA journal_mode = WAL");
      // Without a busy timeout, concurrent processes on one file die with SQLITE_BUSY.
      db.run("PRAGMA busy_timeout = 3000");
      db.run("PRAGMA synchronous = NORMAL");
      // One write transaction so two processes creating the same file cannot both seed meta.
      db.run("BEGIN IMMEDIATE");
      db.run("CREATE TABLE IF NOT EXISTS items (k BLOB NOT NULL UNIQUE, v BLOB NOT NULL)");
      db.run("CREATE TABLE IF NOT EXISTS meta (total INTEGER NOT NULL)");
      db.run("INSERT INTO meta (total) SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM meta)");
      db.run("PRAGMA user_version = 1");
      db.run("COMMIT");

      this.#begin = db.prepare("BEGIN IMMEDIATE");
      this.#commit = db.prepare("COMMIT");
      this.#rollback = db.prepare("ROLLBACK");
      this.#get = db.prepare("SELECT v FROM items WHERE k = ?");
      this.#has = db.prepare("SELECT 1 FROM items WHERE k = ?");
      // The UPSERT keeps the rowid, so overwriting a key does not move it; remove then re-add does.
      this.#upsert = db.prepare("INSERT INTO items (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v");
      this.#delete = db.prepare("DELETE FROM items WHERE k = ?");
      this.#deleteAll = db.prepare("DELETE FROM items");
      this.#count = db.prepare("SELECT count(*) AS n FROM items");
      this.#keyAt = db.prepare("SELECT k FROM items ORDER BY rowid LIMIT 1 OFFSET ?");
      this.#keys = db.prepare("SELECT k FROM items ORDER BY rowid");
      this.#total = db.prepare("SELECT total FROM meta");
      this.#addTotal = db.prepare("UPDATE meta SET total = total + ?");
      this.#setTotal = db.prepare("UPDATE meta SET total = ?");
    } catch (error) {
      // A connection that failed setup is not kept, and the next operation opens another one, so
      // it must not sit on its file descriptors until a GC cycle happens to collect it.
      db.close();
      throw error;
    }
    this.#db = db;
    // Bun's exit-time sqlite3_close returns SQLITE_BUSY while prepared statements are live and
    // ignores it, so without this the WAL is never checkpointed and the named file stays an
    // empty header with every row in the -wal side file.
    if (this.#path !== ":memory:") process.on("exit", () => this.#close());
  }

  #close(): void {
    const db = this.#db;
    if (db === undefined) return;
    this.#db = undefined;
    const statements = [
      this.#begin,
      this.#commit,
      this.#rollback,
      this.#get,
      this.#has,
      this.#upsert,
      this.#delete,
      this.#deleteAll,
      this.#count,
      this.#keyAt,
      this.#keys,
      this.#total,
      this.#addTotal,
      this.#setTotal,
    ];
    for (let i = 0; i < statements.length; i++) statements[i].finalize();
    db.close();
  }

  // Quota accounting reads meta.total and then writes, so the read must hold the write lock.
  #transact(fn: () => void): void {
    this.#begin.run();
    try {
      fn();
    } catch (error) {
      // SQLite has already rolled back on SQLITE_FULL, IOERR and NOMEM; a ROLLBACK then throws
      // "no transaction is active" and would replace the error the caller needs to see.
      if (this.#db!.inTransaction) this.#rollback.run();
      throw error;
    }
    this.#commit.run();
  }

  get(key: string): string | null {
    this.#open();
    const row = this.#get.get(encode(key)) as Row<{ v: Uint8Array }>;
    return row === null ? null : decode(row.v);
  }

  has(key: string): boolean {
    this.#open();
    return this.#has.get(encode(key)) !== null;
  }

  length(): number {
    this.#open();
    return (this.#count.get() as { n: number }).n;
  }

  key(index: number): string | null {
    this.#open();
    const row = this.#keyAt.get(index) as Row<{ k: Uint8Array }>;
    return row === null ? null : decode(row.k);
  }

  keys(): string[] {
    this.#open();
    const rows = this.#keys.values() as [Uint8Array][];
    const keys: string[] = [];
    for (let i = 0; i < rows.length; i++) $arrayPush(keys, decode(rows[i][0]));
    return keys;
  }

  set(key: string, value: string): void {
    this.#open();
    const k = encode(key);
    const v = encode(value);
    this.#transact(() => {
      const old = this.#get.get(k) as Row<{ v: Uint8Array }>;
      if (old !== null && v.equals(old.v)) return;
      const delta = old === null ? k.byteLength + v.byteLength : v.byteLength - old.v.byteLength;
      if ((this.#total.get() as { total: number }).total + delta > QUOTA_BYTES) {
        throw new NativeDOMException("Setting the value exceeded the quota", "QuotaExceededError");
      }
      this.#upsert.run(k, v);
      this.#addTotal.run(delta);
    });
  }

  remove(key: string): void {
    this.#open();
    const k = encode(key);
    this.#transact(() => {
      const old = this.#get.get(k) as Row<{ v: Uint8Array }>;
      if (old === null) return;
      this.#delete.run(k);
      this.#addTotal.run(-(k.byteLength + old.v.byteLength));
    });
  }

  clear(): void {
    this.#open();
    this.#transact(() => {
      this.#deleteAll.run();
      this.#setTotal.run(0);
    });
  }
}

// Methods are called through the Proxy, so `this` is the Proxy and the brand lives in a WeakMap keyed by it.
const areas = new WeakMap<object, Area>();

function areaOf(self: unknown): Area {
  const area = areas.get(self as object);
  if (area === undefined) throw $ERR_INVALID_THIS("Storage");
  return area;
}

// A class, not a function: JSC compiles functions nested in a builtin as non-constructors with no
// `prototype`, so there would be nothing to define the methods on. `new Storage()` reaches the
// Illegal constructor error; calling it without `new` is a plain class TypeError, as in Node.
class Storage {
  constructor() {
    throw $ERR_ILLEGAL_CONSTRUCTOR();
  }
}

// Object-literal methods carry the WebIDL `length` and have no [[Construct]].
const methods = {
  key(index) {
    const area = areaOf(this);
    if (arguments.length < 1) throw $ERR_MISSING_ARGS("index");
    return area.key(index >>> 0);
  },
  getItem(key) {
    const area = areaOf(this);
    if (arguments.length < 1) throw $ERR_MISSING_ARGS("key");
    return area.get(`${key}`);
  },
  setItem(key, value) {
    const area = areaOf(this);
    if (arguments.length < 2) throw $ERR_MISSING_ARGS("key", "value");
    area.set(`${key}`, `${value}`);
  },
  removeItem(key) {
    const area = areaOf(this);
    if (arguments.length < 1) throw $ERR_MISSING_ARGS("key");
    area.remove(`${key}`);
  },
  clear() {
    areaOf(this).clear();
  },
};

for (const name in methods) {
  ObjectDefineProperty(Storage.prototype, name, {
    __proto__: null,
    value: methods[name],
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

ObjectDefineProperty(Storage.prototype, "length", {
  __proto__: null,
  get() {
    return areaOf(this).length();
  },
  enumerable: true,
  configurable: true,
});

ObjectDefineProperty(Storage.prototype, Symbol.toStringTag, {
  __proto__: null,
  value: "Storage",
  configurable: true,
});

function makeStorage(path: string): object {
  const area = new Area(path);
  const target = ObjectCreate(Storage.prototype);

  // The handler never gives the target an own string property, so a stored key is visible exactly when nothing
  // on the prototype chain claims the name. Built-ins win: Storage has neither [LegacyOverrideBuiltIns] nor an
  // indexed getter, and `localStorage.getItem` must never touch SQLite.
  const hidden = (property: PropertyKey): boolean => typeof property !== "string" || property in target;

  const proxy = new NativeProxy(target, {
    get(t, p, receiver) {
      if (!hidden(p)) {
        const value = area.get(p as string);
        if (value !== null) return value;
      }
      return ReflectGet(t, p, receiver);
    },
    set(t, p, value, receiver) {
      // Only an assignment made directly on the storage object stores. An object inheriting from it reaches
      // this trap with itself as receiver and must define the property on itself instead.
      if (typeof p === "string" && receiver === proxy) {
        area.set(p, `${value}`);
        return true;
      }
      return ReflectSet(t, p, value, receiver);
    },
    has(t, p) {
      return ReflectHas(t, p) || (typeof p === "string" && area.has(p));
    },
    deleteProperty(t, p) {
      if (!hidden(p)) {
        area.remove(p as string);
        return true;
      }
      return ReflectDeleteProperty(t, p);
    },
    getOwnPropertyDescriptor(t, p) {
      if (!hidden(p)) {
        const value = area.get(p as string);
        if (value !== null) return { value, writable: true, enumerable: true, configurable: true };
      }
      return ReflectGetOwnPropertyDescriptor(t, p);
    },
    defineProperty(t, p, descriptor) {
      if (typeof p !== "string") return ReflectDefineProperty(t, p, descriptor);
      // WebIDL routes only data descriptors to the named setter. A non-configurable one cannot be honoured
      // either: the target has no such property, so returning true would break the Proxy invariant.
      if (!("value" in descriptor || "writable" in descriptor) || descriptor.configurable === false) return false;
      area.set(p, `${descriptor.value}`);
      return true;
    },
    ownKeys(t) {
      // rowid order, as given: numeric-looking keys are not hoisted because Storage has no indexed getter.
      // The same visibility rule as getOwnPropertyDescriptor, or [[OwnPropertyKeys]] would list a
      // stored "getItem" that [[GetOwnProperty]] then denies.
      const stored = area.keys();
      const keys: (string | symbol)[] = [];
      for (let i = 0; i < stored.length; i++) if (!hidden(stored[i])) $arrayPush(keys, stored[i]);
      const symbols = ReflectOwnKeys(t);
      for (let i = 0; i < symbols.length; i++) $arrayPush(keys, symbols[i]);
      return keys;
    },
    preventExtensions() {
      return false;
    },
  });

  areas.set(proxy, area);
  return proxy;
}

let session: object | undefined;
let local: object | undefined;

export default {
  Storage,
  sessionStorage(): object {
    return (session ??= makeStorage(":memory:"));
  },
  localStorage(path: string): object {
    return (local ??= makeStorage(path));
  },
};
