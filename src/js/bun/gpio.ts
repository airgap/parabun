// Hardcoded module "bun:gpio"
//
// Linux GPIO character device (uAPI v2) wrapper. Same surface across
// RPi 4, RPi 5 (the new pinctrl-rp1 driver exposes the same uAPI),
// Jetson, and any other Linux SBC — character-device, not deprecated
// sysfs.
//
//   import gpio from "bun:gpio";
//
//   const chips = gpio.chips();   // sync — [{ path, label, lines }]
//
//   await using chip = gpio.open("/dev/gpiochip0");
//
//   // Single-line ergonomics.
//   const led = chip.line(17, { mode: "out", initial: 0 });
//   led.write(1);
//   led.toggle();
//   led.value.get();              // current 0/1 (Signal)
//
//   const button = chip.line(27, { mode: "in", pull: "up", debounceMs: 5, edge: "falling" });
//   for await (const e of button.edges()) {
//     console.log("press at", e.timestampNs);
//   }
//
// Lines and chips are AsyncDisposable — `await using` releases the fds
// at scope exit. Manual close() is also exposed.

const native = $cpp("parabun_gpio.cpp", "createParabunGpio");
const signalsMod = require("./signals.ts");

// Structural Signal types — keep this module agnostic of bun:signals's
// class hierarchy. Same shape as audio.ts / camera.ts / vision.ts.
type Signal<T> = {
  get(): T;
  peek(): T;
  subscribe(cb: (v: T) => void): () => void;
};
type WritableSignal<T> = Signal<T> & { set(v: T): void };

// ─── Types ─────────────────────────────────────────────────────────────────

type ChipInfo = {
  /** Absolute path under /dev (e.g. "/dev/gpiochip0"). */
  path: string;
  /** Driver label (e.g. "rp1-gpio" on Pi 5, "pinctrl-bcm2711" on Pi 4). */
  label: string;
  /** Number of lines this chip exposes. */
  lines: number;
};

type LineMode = "in" | "out";
type LinePull = "up" | "down" | "off";
type LineEdge = "rising" | "falling" | "both" | "none";

type LineOptions = {
  mode: LineMode;
  /** For inputs: bias resistor configuration. Default "off". */
  pull?: LinePull;
  /**
   * For inputs: hardware debounce. 0 disables. Note: not every driver supports
   * this — RPi 5 (RP1) does, RPi 4 (BCM2711) does not. When unsupported, the
   * kernel returns ENOTSUP at request time.
   */
  debounceMs?: number;
  /**
   * For inputs: edges to deliver as events. Default "none" — readEvent stays
   * idle. Set to "rising" / "falling" / "both" to populate `line.edges()`.
   */
  edge?: LineEdge;
  /** For outputs: starting value, 0 or 1. Default 0. */
  initial?: 0 | 1;
};

type EdgeEvent = {
  kind: "rising" | "falling";
  /** Kernel-side monotonic timestamp in nanoseconds. */
  timestampNs: bigint;
  /** Line value at the edge — 1 for rising, 0 for falling. */
  value: 0 | 1;
};

interface Line extends AsyncDisposable {
  /** Chip-relative line number, 0..(chip.lines - 1). */
  readonly offset: number;
  /** Read-only signal of the most recent observed value. Updates on read() / edge events. */
  readonly value: Signal<0 | 1>;
  /** Read the line. Returns 0 or 1. Throws on closed. */
  read(): 0 | 1;
  /** Write 0 or 1 to an output line. Throws on closed or if the line was acquired as input. */
  write(v: 0 | 1): void;
  /** Output: invert the current value. Equivalent to `line.write(line.value.get() ^ 1)`. */
  toggle(): 0 | 1;
  /** Async iterator of edge events. Only meaningful if the line was acquired with `edge: ...`. */
  edges(): AsyncIterableIterator<EdgeEvent>;
  /** Release the line. Idempotent. */
  close(): void;
}

interface Chip extends AsyncDisposable {
  readonly path: string;
  readonly label: string;
  readonly lines: number;
  /** Acquire a single line on this chip. */
  line(offset: number, opts: LineOptions): Line;
  /** Release the chip handle. Lines acquired through this chip stay open until they're individually closed. */
  close(): void;
}

// ─── Encoding maps for the native layer ────────────────────────────────────
// These mirror parabun_gpio.cpp's switch statements; keep them in sync.

const MODE_CODES: Record<LineMode, number> = { in: 0, out: 1 };
const PULL_CODES: Record<LinePull, number> = { off: 0, up: 1, down: 2 };
const EDGE_CODES: Record<LineEdge, number> = { none: 0, rising: 1, falling: 2, both: 3 };

// FinalizationRegistry backstops — if a Chip / Line drops without close(),
// the kernel fd is freed at GC time rather than leaking. Same pattern as
// bun:audio's pcmRegistry / bun:camera's cameraRegistry.
const chipRegistry = new FinalizationRegistry<bigint>(fd => {
  if (fd !== 0n) native.closeChip(fd);
});
const lineRegistry = new FinalizationRegistry<bigint>(fd => {
  if (fd !== 0n) native.closeLine(fd);
});

// ─── Public API ────────────────────────────────────────────────────────────

/** List every /dev/gpiochipN with its label and line count. Synchronous. */
function chips(): ChipInfo[] {
  return native.listChips() as ChipInfo[];
}

class LineImpl implements Line {
  #fd: bigint;
  readonly offset: number;
  #mode: LineMode;
  #closed = false;
  #value: WritableSignal<0 | 1>;

  constructor(fd: bigint, offset: number, mode: LineMode, initial: 0 | 1) {
    this.#fd = fd;
    this.offset = offset;
    this.#mode = mode;
    // Output: starts at the requested initial value (kernel applied it).
    // Input: kernel returned a real reading at request — but we don't hit
    // GET_VALUES here to avoid a syscall in the hot path. First read()
    // call will populate the signal accurately.
    this.#value = signalsMod.signal(mode === "out" ? initial : 0);
    lineRegistry.register(this, fd, this);
  }

  get value(): Signal<0 | 1> {
    return this.#value;
  }

  read(): 0 | 1 {
    if (this.#closed) throw new Error("bun:gpio: line is closed");
    const v = native.readLine(this.#fd) as 0 | 1;
    if (v !== this.#value.peek()) this.#value.set(v);
    return v;
  }

  write(v: 0 | 1): void {
    if (this.#closed) throw new Error("bun:gpio: line is closed");
    if (this.#mode !== "out") throw new Error("bun:gpio: write() requires an output line");
    const value: 0 | 1 = v ? 1 : 0;
    native.writeLine(this.#fd, value);
    if (value !== this.#value.peek()) this.#value.set(value);
  }

  toggle(): 0 | 1 {
    const next: 0 | 1 = this.#value.peek() === 0 ? 1 : 0;
    this.write(next);
    return next;
  }

  async *edges(): AsyncIterableIterator<EdgeEvent> {
    if (this.#mode !== "in") throw new Error("bun:gpio: edges() requires an input line");
    while (!this.#closed) {
      let ev: EdgeEvent;
      try {
        ev = (await native.readEvent(this.#fd)) as EdgeEvent;
      } catch (e) {
        // Closing the fd while a read is in flight returns EBADF / EAGAIN /
        // similar. Treat as end-of-stream rather than throwing — the caller
        // already disposed.
        if (this.#closed) return;
        throw e;
      }
      if (this.#closed) return;
      // Edge events also drive the signal — the consumer doesn't need a
      // separate read() to keep `line.value` current.
      if (ev.value !== this.#value.peek()) this.#value.set(ev.value);
      yield ev;
    }
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    const fd = this.#fd;
    this.#fd = 0n;
    if (fd !== 0n) {
      lineRegistry.unregister(this);
      native.closeLine(fd);
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    this.close();
    return Promise.resolve();
  }
}

class ChipImpl implements Chip {
  #fd: bigint;
  readonly path: string;
  readonly label: string;
  readonly lines: number;
  #closed = false;

  constructor(fd: bigint, info: ChipInfo) {
    this.#fd = fd;
    this.path = info.path;
    this.label = info.label;
    this.lines = info.lines;
    chipRegistry.register(this, fd, this);
  }

  line(offset: number, opts: LineOptions): Line {
    if (this.#closed) throw new Error("bun:gpio: chip is closed");
    if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0 || offset >= this.lines) {
      throw new RangeError(`bun:gpio: line offset must be an integer in [0, ${this.lines})`);
    }
    const mode = opts.mode;
    if (mode !== "in" && mode !== "out") {
      throw new TypeError('bun:gpio: line mode must be "in" or "out"');
    }
    const pull = opts.pull ?? "off";
    if (PULL_CODES[pull] === undefined) {
      throw new TypeError(`bun:gpio: pull must be "up" / "down" / "off", got "${pull}"`);
    }
    const edge = opts.edge ?? "none";
    if (EDGE_CODES[edge] === undefined) {
      throw new TypeError(`bun:gpio: edge must be "rising" / "falling" / "both" / "none", got "${edge}"`);
    }
    const debounceMs = Math.max(0, Math.floor(opts.debounceMs ?? 0));
    const initial: 0 | 1 = opts.initial === 1 ? 1 : 0;

    const lineFd = native.requestLine(
      this.#fd,
      offset,
      MODE_CODES[mode],
      PULL_CODES[pull],
      EDGE_CODES[edge],
      debounceMs,
      initial,
    ) as bigint;
    return new LineImpl(lineFd, offset, mode, initial);
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    const fd = this.#fd;
    this.#fd = 0n;
    if (fd !== 0n) {
      chipRegistry.unregister(this);
      native.closeChip(fd);
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    this.close();
    return Promise.resolve();
  }
}

/** Open a gpiochip by absolute /dev path. */
function open(path: string): Chip {
  if (typeof path !== "string" || path.length === 0) {
    throw new TypeError("bun:gpio.open: path must be a non-empty string");
  }
  // Ask the native side for chip info first so the path/label/lines are
  // available before we hand back the chip — and we get a clear error if
  // the path isn't actually a gpiochip.
  const info = native.chipInfo(path) as ChipInfo;
  const fd = native.openChip(path) as bigint;
  return new ChipImpl(fd, info);
}

export default {
  chips,
  open,
};
