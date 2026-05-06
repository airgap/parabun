// Hardcoded module "parabun:spi"
//
// Linux spidev character device wrapper. Full-duplex transfers + multi-
// segment transactions with CS held across segments. Same shape on RPi
// 4/5, Jetson, NUC + breakout — character device, no vendored libspidev.
//
//   import spi from "parabun:spi";
//
//   spi.devices();   // sync — [{ path, bus, cs }, ...]
//
//   await using dev = spi.open("/dev/spidev0.0", {
//     mode: 0,           // SPI mode 0–3
//     bitsPerWord: 8,
//     speedHz: 1_000_000,
//   });
//
//   const rx = await dev.transfer(Uint8Array.of(0x9F, 0, 0, 0));   // full-duplex
//
//   await dev.write(Uint8Array.of(0x06));
//   const id = await dev.read(3);
//
//   // Multi-segment transaction (CS stays asserted across segments):
//   const data = await dev.transactSegments([
//     { tx: Uint8Array.of(0x03, 0, 0, 0) },
//     { rx: 256 },
//   ]);
//
// Devices are AsyncDisposable; `await using` releases the fd at scope exit.

const native = $cpp("parabun_spi.cpp", "createParabunSpi");
const signalsMod = require("./signals.ts");

// Structural Signal types — keep this module agnostic of @para/signals's
// class hierarchy. Same shape as audio.ts / camera.ts / gpio.ts / i2c.ts.
type Signal<T> = {
  get(): T;
  peek(): T;
  subscribe(cb: (v: T) => void): () => void;
};
type WritableSignal<T> = Signal<T> & { set(v: T): void };

// ─── Types ─────────────────────────────────────────────────────────────────

type DeviceInfo = {
  /** Absolute path under /dev (e.g. "/dev/spidev0.0"). */
  path: string;
  /** Bus number — the N in spidev<N>.<M>. */
  bus: number;
  /** Chip-select index — the M in spidev<N>.<M>. */
  cs: number;
};

type DeviceOptions = {
  /** SPI mode 0..3 (CPOL/CPHA combinations). Default 0. */
  mode?: 0 | 1 | 2 | 3;
  /** Bits per transferred word. Default 8. */
  bitsPerWord?: number;
  /** Max clock speed in Hz. Default 1_000_000 (1 MHz). */
  speedHz?: number;
};

type TransactSegment =
  | { tx: Uint8Array; rx?: number; speedHz?: number; delayUs?: number; bitsPerWord?: number; csChange?: boolean }
  | { rx: number; speedHz?: number; delayUs?: number; bitsPerWord?: number; csChange?: boolean };

interface Device extends AsyncDisposable, Disposable {
  readonly path: string;
  readonly bus: number;
  readonly cs: number;
  readonly mode: 0 | 1 | 2 | 3;
  readonly bitsPerWord: number;
  readonly speedHz: number;
  /** True from open() until close()/[Symbol.dispose]. */
  readonly alive: Signal<boolean>;
  /** Full-duplex transfer. Returns the rx bytes captured during tx. */
  transfer(tx: Uint8Array, opts?: { speedHz?: number; delayUs?: number }): Promise<Uint8Array>;
  /** Half-duplex write. Equivalent to `transfer(tx)` but discards rx. */
  write(tx: Uint8Array, opts?: { speedHz?: number; delayUs?: number }): Promise<void>;
  /** Half-duplex read. Sends `length` zero bytes, returns the captured rx. */
  read(length: number, opts?: { speedHz?: number; delayUs?: number }): Promise<Uint8Array>;
  /**
   * Multi-segment transaction — CS held across all segments unless
   * `csChange: true` is set on a segment. Returns one slot per segment;
   * tx-only segments get `undefined`.
   */
  transactSegments(segments: TransactSegment[]): Promise<Array<Uint8Array | undefined>>;
  /**
   * Run an effect bound to this device's lifetime. Auto-disposed on
   * close() — no defensive `if (alive.get())` guards needed.
   */
  use(fn: () => void | (() => void)): () => void;
  /** Release the device fd. Idempotent. */
  close(): void;
  [Symbol.dispose](): void;
}

const deviceRegistry = new FinalizationRegistry<bigint>(fd => {
  if (fd !== 0n) native.closeDevice(fd);
});

// ─── Public API ────────────────────────────────────────────────────────────

/** Enumerate every /dev/spidev<bus>.<cs>. Synchronous. */
function devices(): DeviceInfo[] {
  return native.listDevices() as DeviceInfo[];
}

class DeviceImpl implements Device {
  #fd: bigint;
  readonly path: string;
  readonly bus: number;
  readonly cs: number;
  readonly mode: 0 | 1 | 2 | 3;
  readonly bitsPerWord: number;
  readonly speedHz: number;
  #closed = false;
  #alive: WritableSignal<boolean>;
  #boundEffects: Array<() => void> = [];

  constructor(fd: bigint, info: DeviceInfo, opts: { mode: 0 | 1 | 2 | 3; bitsPerWord: number; speedHz: number }) {
    this.#fd = fd;
    this.path = info.path;
    this.bus = info.bus;
    this.cs = info.cs;
    this.mode = opts.mode;
    this.bitsPerWord = opts.bitsPerWord;
    this.speedHz = opts.speedHz;
    this.#alive = signalsMod.signal(true);
    deviceRegistry.register(this, fd, this);
  }

  get alive(): Signal<boolean> {
    return this.#alive;
  }

  use(fn: () => void | (() => void)): () => void {
    const stop = signalsMod.effect(fn);
    this.#boundEffects.push(stop);
    return stop;
  }

  #assertOpen(): void {
    if (this.#closed) throw new Error("parabun:spi: device is closed");
  }

  async transfer(tx: Uint8Array, opts: { speedHz?: number; delayUs?: number } = {}): Promise<Uint8Array> {
    this.#assertOpen();
    return native.transfer(this.#fd, tx, opts.speedHz ?? 0, opts.delayUs ?? 0) as Uint8Array;
  }

  async write(tx: Uint8Array, opts: { speedHz?: number; delayUs?: number } = {}): Promise<void> {
    this.#assertOpen();
    // spidev never has a "write only" ioctl — the rx buffer is always
    // returned, and we discard it. Hot-loop callers should prefer
    // transactSegments() with no rx.
    native.transfer(this.#fd, tx, opts.speedHz ?? 0, opts.delayUs ?? 0);
  }

  async read(length: number, opts: { speedHz?: number; delayUs?: number } = {}): Promise<Uint8Array> {
    this.#assertOpen();
    if (typeof length !== "number" || !Number.isInteger(length) || length <= 0) {
      throw new RangeError(`parabun:spi: read length must be a positive integer, got ${length}`);
    }
    // Half-duplex read shape: tx is a length-N zero buffer; rx is captured.
    const tx = new Uint8Array(length);
    return native.transfer(this.#fd, tx, opts.speedHz ?? 0, opts.delayUs ?? 0) as Uint8Array;
  }

  async transactSegments(segments: TransactSegment[]): Promise<Array<Uint8Array | undefined>> {
    this.#assertOpen();
    if (!Array.isArray(segments)) {
      throw new TypeError("parabun:spi.transactSegments: segments must be an array");
    }
    return native.transactSegments(this.#fd, segments) as Array<Uint8Array | undefined>;
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    const fd = this.#fd;
    this.#fd = 0n;
    if (fd !== 0n) {
      deviceRegistry.unregister(this);
      native.closeDevice(fd);
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

/** Open a spidev device by absolute /dev path. */
function open(path: string, opts: DeviceOptions = {}): Device {
  if (typeof path !== "string" || path.length === 0) {
    throw new TypeError("parabun:spi.open: path must be a non-empty string");
  }
  const mode = (opts.mode ?? 0) as 0 | 1 | 2 | 3;
  if (mode !== 0 && mode !== 1 && mode !== 2 && mode !== 3) {
    throw new RangeError(`parabun:spi: mode must be 0..3, got ${mode}`);
  }
  const bitsPerWord = opts.bitsPerWord ?? 8;
  if (typeof bitsPerWord !== "number" || !Number.isInteger(bitsPerWord) || bitsPerWord < 1 || bitsPerWord > 32) {
    throw new RangeError(`parabun:spi: bitsPerWord must be 1..32, got ${bitsPerWord}`);
  }
  const speedHz = opts.speedHz ?? 1_000_000;
  if (typeof speedHz !== "number" || !Number.isInteger(speedHz) || speedHz <= 0) {
    throw new RangeError(`parabun:spi: speedHz must be a positive integer, got ${speedHz}`);
  }

  // Parse bus/cs from path: /dev/spidevN.M.
  const match = /\/dev\/spidev(\d+)\.(\d+)$/.exec(path);
  if (!match) {
    throw new TypeError(`parabun:spi.open: path must look like /dev/spidev<bus>.<cs>, got "${path}"`);
  }
  const info: DeviceInfo = { path, bus: Number(match[1]), cs: Number(match[2]) };

  const fd = native.openDevice(path, mode, bitsPerWord, speedHz) as bigint;
  return new DeviceImpl(fd, info, { mode, bitsPerWord, speedHz });
}

export default {
  devices,
  open,
};
