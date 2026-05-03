// Hardcoded module "parabun:i2c"
//
// Linux i2c-dev character device wrapper. Combined-message transactions
// via I2C_RDWR + SMBus shortcuts via I2C_SMBUS. Same shape on RPi 4/5,
// Jetson, NUC + breakout — character device, no vendored libi2c.
//
//   import i2c from "parabun:i2c";
//
//   const buses = i2c.buses();   // sync — [{ path, name, capabilities }]
//
//   await using bus = i2c.open("/dev/i2c-1");
//   const present = await bus.scan();   // [0x40, 0x76, ...]
//
//   const dev = bus.device(0x76);
//   await dev.write(Uint8Array.of(0xF7));
//   const buf = await dev.read(6);
//
//   // Combined-message transaction (the right way for most chip protocols):
//   const [, payload] = await dev.transact([
//     { write: Uint8Array.of(0xF7) },
//     { read: 6 },
//   ]);
//
//   // SMBus convenience:
//   const id  = await dev.smbus.readByte(0xD0);
//   await dev.smbus.writeWord(0xF4, 0x27);
//
// Buses are AsyncDisposable; `await using` releases the fd at scope exit.

const native = $cpp("parabun_i2c.cpp", "createParabunI2c");
const signalsMod = require("./signals.ts");

// Structural Signal types — keep this module agnostic of para:signals's
// class hierarchy. Same shape as audio.ts / camera.ts / gpio.ts.
type Signal<T> = {
  get(): T;
  peek(): T;
  subscribe(cb: (v: T) => void): () => void;
};
type WritableSignal<T> = Signal<T> & { set(v: T): void };

// ─── Linux i2c-dev I2C_FUNCS bits (mirrors <linux/i2c.h>) ──────────────────
// Used to surface human-readable capabilities on each bus. Kept here so JS
// callers can introspect without an extra round-trip.
const FUNC_BITS: Array<[bigint, string]> = [
  [0x00000001n, "i2c"],
  [0x00000002n, "10bit_addr"],
  [0x00000004n, "protocol_mangling"],
  [0x00000008n, "smbus_pec"],
  [0x00000010n, "nostart"],
  [0x00000020n, "slave"],
  [0x00008000n, "smbus_block_proc_call"],
  [0x00010000n, "smbus_quick"],
  [0x00020000n, "smbus_read_byte"],
  [0x00040000n, "smbus_write_byte"],
  [0x00080000n, "smbus_read_byte_data"],
  [0x00100000n, "smbus_write_byte_data"],
  [0x00200000n, "smbus_read_word_data"],
  [0x00400000n, "smbus_write_word_data"],
  [0x00800000n, "smbus_proc_call"],
  [0x01000000n, "smbus_read_block_data"],
  [0x02000000n, "smbus_write_block_data"],
  [0x04000000n, "smbus_read_i2c_block"],
  [0x08000000n, "smbus_write_i2c_block"],
  [0x10000000n, "smbus_host_notify"],
];

function decodeCapabilities(funcs: bigint): string[] {
  const out: string[] = [];
  for (const [bit, name] of FUNC_BITS) {
    if ((funcs & bit) !== 0n) out.push(name);
  }
  return out;
}

// ─── Types ─────────────────────────────────────────────────────────────────

type BusInfo = {
  /** Absolute path under /dev (e.g. "/dev/i2c-1"). */
  path: string;
  /** Driver-supplied bus name (e.g. "bcm2835 (i2c@7e804000)"). */
  name: string;
  /** Capability flags exposed by the controller. */
  capabilities: string[];
};

type TransactSegment = { write: Uint8Array } | { read: number };

interface Device {
  readonly addr: number;
  /** Plain write — `write` flag, no register prefix. */
  write(bytes: Uint8Array): Promise<void>;
  /** Plain read — `read` flag, no register prefix. */
  read(length: number): Promise<Uint8Array>;
  /**
   * Combined-message transaction. Each segment is either `{write: bytes}`
   * or `{read: length}`. The kernel issues all segments back-to-back with
   * a repeated start, no STOP between segments — the right shape for
   * register-access patterns on most chips.
   *
   * Returns one slot per segment: read segments yield a Uint8Array, write
   * segments yield undefined (positions preserved so indices line up).
   */
  transact(segments: TransactSegment[]): Promise<Array<Uint8Array | undefined>>;
  /** SMBus convenience methods. Most chips speak a strict SMBus subset. */
  readonly smbus: {
    quick(write?: boolean): Promise<boolean>;
    readByte(cmd: number): Promise<number>;
    readWord(cmd: number): Promise<number>;
    writeByte(cmd: number, value: number): Promise<void>;
    writeWord(cmd: number, value: number): Promise<void>;
    readBlock(cmd: number): Promise<Uint8Array>;
    writeBlock(cmd: number, bytes: Uint8Array): Promise<void>;
  };
}

interface Bus extends AsyncDisposable, Disposable {
  readonly path: string;
  readonly name: string;
  readonly capabilities: string[];
  /** True from open() until close()/[Symbol.dispose]. */
  readonly alive: Signal<boolean>;
  /**
   * Probe addresses 0x03..0x77 with an SMBus quick transaction; returns the
   * 7-bit addresses that ACK'd. Skips known-reserved ranges. This is the
   * same shape as `i2cdetect -y N`.
   */
  scan(): Promise<number[]>;
  /** Bind to a 7-bit address. Devices share the bus fd; no syscall. */
  device(addr: number): Device;
  /**
   * Run an effect bound to this bus's lifetime. Auto-disposed on
   * close() — no defensive `if (alive.get())` guards needed.
   */
  use(fn: () => void | (() => void)): () => void;
  /** Release the bus fd. Idempotent. */
  close(): void;
  [Symbol.dispose](): void;
}

// FinalizationRegistry backstop — if a Bus drops without close(), the kernel
// fd is freed at GC time rather than leaking. Same pattern as parabun:gpio.
const busRegistry = new FinalizationRegistry<bigint>(fd => {
  if (fd !== 0n) native.closeBus(fd);
});

// ─── Public API ────────────────────────────────────────────────────────────

/** List every /dev/i2c-N with its driver name + capability flags. Synchronous. */
function buses(): BusInfo[] {
  const raw = native.listBuses() as Array<{ path: string; name: string; funcs: bigint }>;
  return raw.map(b => ({
    path: b.path,
    name: b.name,
    capabilities: decodeCapabilities(b.funcs),
  }));
}

class DeviceImpl implements Device {
  readonly addr: number;
  #bus: BusImpl;

  constructor(bus: BusImpl, addr: number) {
    this.#bus = bus;
    this.addr = addr;
  }

  async write(bytes: Uint8Array): Promise<void> {
    this.#bus.assertOpen();
    native.write(this.#bus.fd, this.addr, bytes);
  }

  async read(length: number): Promise<Uint8Array> {
    this.#bus.assertOpen();
    return native.read(this.#bus.fd, this.addr, length) as Uint8Array;
  }

  async transact(segments: TransactSegment[]): Promise<Array<Uint8Array | undefined>> {
    this.#bus.assertOpen();
    return native.transact(this.#bus.fd, this.addr, segments) as Array<Uint8Array | undefined>;
  }

  readonly smbus = {
    quick: async (write: boolean = true): Promise<boolean> => {
      this.#bus.assertOpen();
      return native.smbusQuick(this.#bus.fd, this.addr, !!write) as boolean;
    },
    readByte: async (cmd: number): Promise<number> => {
      this.#bus.assertOpen();
      return native.smbusReadByte(this.#bus.fd, this.addr, cmd & 0xff) as number;
    },
    readWord: async (cmd: number): Promise<number> => {
      this.#bus.assertOpen();
      return native.smbusReadWord(this.#bus.fd, this.addr, cmd & 0xff) as number;
    },
    writeByte: async (cmd: number, value: number): Promise<void> => {
      this.#bus.assertOpen();
      native.smbusWriteByte(this.#bus.fd, this.addr, cmd & 0xff, value & 0xff);
    },
    writeWord: async (cmd: number, value: number): Promise<void> => {
      this.#bus.assertOpen();
      native.smbusWriteWord(this.#bus.fd, this.addr, cmd & 0xff, value & 0xffff);
    },
    readBlock: async (cmd: number): Promise<Uint8Array> => {
      this.#bus.assertOpen();
      return native.smbusReadBlock(this.#bus.fd, this.addr, cmd & 0xff) as Uint8Array;
    },
    writeBlock: async (cmd: number, bytes: Uint8Array): Promise<void> => {
      this.#bus.assertOpen();
      native.smbusWriteBlock(this.#bus.fd, this.addr, cmd & 0xff, bytes);
    },
  };
}

class BusImpl implements Bus {
  fd: bigint;
  readonly path: string;
  readonly name: string;
  readonly capabilities: string[];
  #closed = false;
  #alive: WritableSignal<boolean>;
  #boundEffects: Array<() => void> = [];

  constructor(fd: bigint, info: BusInfo) {
    this.fd = fd;
    this.path = info.path;
    this.name = info.name;
    this.capabilities = info.capabilities;
    this.#alive = signalsMod.signal(true);
    busRegistry.register(this, fd, this);
  }

  get alive(): Signal<boolean> {
    return this.#alive;
  }

  use(fn: () => void | (() => void)): () => void {
    const stop = signalsMod.effect(fn);
    this.#boundEffects.push(stop);
    return stop;
  }

  assertOpen(): void {
    if (this.#closed) throw new Error("parabun:i2c: bus is closed");
  }

  async scan(): Promise<number[]> {
    this.assertOpen();
    const found: number[] = [];
    // 0x03..0x77 — the user-addressable 7-bit range. 0x00–0x02 and 0x78–0x7F
    // are reserved for general-call / 10-bit / start-byte / HS-mode and won't
    // ACK from a normal device anyway.
    for (let addr = 0x03; addr <= 0x77; addr++) {
      // Some chips are known to misbehave on quick-write probes (e.g.
      // EEPROM addresses 0x30–0x37 and 0x50–0x5f sometimes). i2cdetect's
      // default mode flips between quick-write and read-byte; we use
      // quick-write everywhere because devices that latch on the data
      // byte of a read can corrupt themselves under repeated probes.
      const ok = (await native.smbusQuick(this.fd, addr, true)) as boolean;
      if (ok) found.push(addr);
    }
    return found;
  }

  device(addr: number): Device {
    this.assertOpen();
    if (typeof addr !== "number" || !Number.isInteger(addr) || addr < 0 || addr > 0x7f) {
      throw new RangeError(`parabun:i2c: addr must be a 7-bit integer in [0x00, 0x7f], got ${addr}`);
    }
    return new DeviceImpl(this, addr);
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    const fd = this.fd;
    this.fd = 0n;
    if (fd !== 0n) {
      busRegistry.unregister(this);
      native.closeBus(fd);
    }
    if (this.#alive.peek()) {
      this.#alive.set(false);
      while (this.#boundEffects.length > 0) {
        const stop = this.#boundEffects.pop()!;
        try {
          stop();
        } catch {}
      }
    }
  }

  [Symbol.dispose](): void {
    this.close();
  }

  [Symbol.asyncDispose](): Promise<void> {
    this.close();
    return Promise.resolve();
  }
}

/** Open an i2c bus by absolute /dev path. */
function open(path: string): Bus {
  if (typeof path !== "string" || path.length === 0) {
    throw new TypeError("parabun:i2c.open: path must be a non-empty string");
  }
  // Ask the native side for bus info first so path/name/capabilities are
  // available before we hand back the bus — and we get a clear error if
  // the path isn't actually an i2c bus.
  const raw = native.busInfo(path) as { path: string; name: string; funcs: bigint };
  const info: BusInfo = {
    path: raw.path,
    name: raw.name,
    capabilities: decodeCapabilities(raw.funcs),
  };
  const fd = native.openBus(path) as bigint;
  return new BusImpl(fd, info);
}

export default {
  buses,
  open,
};
