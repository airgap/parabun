# demos/

Real-world parabun examples. Each one is a single `.pts` file that compiles + runs against the parabun runtime.

| Demo | What | Hardware / fixtures |
|---|---|---|
| [`iot-button-led.pts`](iot-button-led.pts) | Reactive button → LED — `chip.line({ pollHz: 50 })` drives `button.value`, one `effect { }` block does the whole control loop | Linux SBC + GPIO. |
| [`iot-bank-mirror.pts`](iot-bank-mirror.pts) | 4-button bank → 4-LED bank via `chip.bank({ pollHz: 50 })` and one `effect { }` over `buttons.value: Signal<bigint>` | Linux SBC + GPIO. |
| [`iot-sensor.pts`](iot-sensor.pts) | Periodic sensor read → derived threshold → reactive log via `signals.fromInterval` + `derived` + `effect`. Same shape as a real i2c sensor with `sensor.smbus.readWord(...)` | None — simulated sensor. |
| [`iot-dashboard.pts`](iot-dashboard.pts) | Simulated IoT control panel — `signal` declarations, auto-derived state, `effect { }`, `~> ... when ...` reactive binding | None — pure simulation. |
| [`gpio-blink.pts`](gpio-blink.pts) | Imperative LED blink + button-press exit using `for await (e of button.edges())` | Linux SBC + GPIO. `--seconds N` runs non-interactively. |
| [`i2c-scan.pts`](i2c-scan.pts) | List every i2c bus + scan for ack'ing devices | Linux + `i2c-dev`. Skips buses the user doesn't have permission for. |
| [`csv-pipeline.pts`](csv-pipeline.pts) | Parse a CSV, summarise the first numeric column with pure functions threaded by `\|>` | None — pass any CSV path. |
| [`image-batch-resize.pts`](image-batch-resize.pts) | Decode → resize → encode a directory of images via `parallel.pmap` worker pool | None — pass `<inDir> <outDir> <maxEdge>`. |
| [`audio-meter.pts`](audio-meter.pts) | Live mic peak meter (`mic.peakLevel` signal + parabun `effect { }` block) | ALSA / CoreAudio / WASAPI input. |
| [`llm-chat.pts`](llm-chat.pts) | Stream tokens from a GGUF Llama checkpoint, report tokens-per-second | `LLM_FIXTURE=<path>.gguf`. |
| [`whisper-transcribe.pts`](whisper-transcribe.pts) | Transcribe a WAV via `bun:speech` (Whisper backend) | `WHISPER_MODEL=<path>/ggml-*.bin`, plus a 16 kHz mono WAV. |
| [`assistant-3line.pts`](assistant-3line.pts) | Three-line voice assistant (mic → STT → LLM → TTS → speaker) | LLM gguf + Whisper bin + Piper onnx. |

## Running

All demos require a built parabun runtime:

```sh
bun run build:release demos/<demo>.pts [args]
```

For development:

```sh
bun bd run demos/<demo>.pts [args]
```

## Validated this session

| Demo | Target | Status |
|---|---|---|
| `iot-button-led` | Pi 5 | ✅ chip.line({pollHz:50}) drives button.value, one effect { } block writes LED. 2 s non-interactive run. |
| `iot-bank-mirror` | Pi 5 | ✅ chip.bank({pollHz:50}) drives 4-bit Signal<bigint>; effect mirrors buttons → LEDs in one bitwise expression. |
| `iot-sensor` | dev box | ✅ fromInterval drives signal at 5 Hz, derived recomputes isHot, effect logs threshold crossings. |
| `iot-dashboard` | dev box | ✅ derived signals + effect + ~> binding fire as expected through a 9-step sensor sweep. |
| `csv-pipeline` | dev box | ✅ summarises numeric columns end-to-end |
| `image-batch-resize` | dev box | ✅ 3-image fixture resize, 4.6 img/s |
| `i2c-scan` | dev box | ✅ enumerates 8 buses, skips permission-denied cleanly |
| `i2c-scan` | Pi 5 | ✅ 2 buses, 117 ack'd addresses each (brcmstb quirk) |
| `gpio-blink` | Pi 5 | ✅ 2-second non-interactive run on `/dev/gpiochip4` (RP1) |
| `llm-chat` | dev box | ✅ Llama-3.2-1B Q4_K_M, "2+2=4" |
| `whisper-transcribe` | dev box | ✅ JFK clip → "ask not what your country..." |
| `audio-meter` | — | parses; live mic interactive |
| `assistant-3line` | — | parses; needs full model trio |

## Parabun syntax used

- `signal NAME = …` — reactive cell. RHS that reads another signal auto-promotes to a derived. (`iot-dashboard.pts`)
- `effect { … }` — block sugar for `signals.effect(() => …)`. Tracks every signal it reads. (`iot-button-led.pts`, `iot-dashboard.pts`, `audio-meter.pts`)
- `A ~> B [when C]` — reactive binding. Re-evaluates `A` and writes into `B` whenever the deps change; optional `when` guard. (`iot-dashboard.pts`)
- `pure function …` — parse-time purity check (`csv-pipeline.pts`)
- `|>` pipeline — `csv-pipeline.pts`
- `..=` await-in-declaration — `whisper-transcribe.pts`
- `await using` — every demo holding a kernel resource (gpio chip / i2c bus / LLM model)
- `for await (… of …)` — token streams (`llm-chat.pts`), edge events (`gpio-blink.pts`), audio frames (`audio-meter.pts`)

## Reactive shape — what makes IoT simple here

Three primitives carry the full IoT story:

- **`chip.line({ pollHz: N })`** / **`chip.bank({ pollHz: N })`** — driver-level polling baked into bun:gpio so `line.value` / `bank.value` update on hardware change without the caller wiring `setInterval`.
- **`signals.fromInterval(fn, periodMs)`** — the same shape for any periodic source. Wraps `i2c.smbus.readWord(...)` / `dev.read(...)` / a custom HTTP poll into a `Signal` with one call.
- **`effect { … }`** + **`derived(() => …)`** — the reaction surface. Every signal read inside is tracked automatically; the body re-runs on any change.

Common pattern, three lines:

```parabun
const sensor = signals.fromInterval(() => dev.smbus.readWord(0xFA), 500);
const isHot = derived(() => (sensor.signal.get() ?? 0) > 80);
effect { if (isHot.get()) console.log("HOT"); }
```

Same shape works for GPIO inputs, audio levels, network polls — anywhere a value changes over time.

## Known limitation: bun:gpio edge events

`line.edges()` calls a synchronous blocking `read()` on the kernel-event fd, which currently runs on the JS main thread — so it can't be drained in the background while another reactive control loop runs in parallel. The IoT demos use `pollHz` (poll-based) instead. Filed as LYK-786 to move `readEvent` off-thread; once that ships, `edge: "..."` will drive `line.value` at hardware-event latency too.
