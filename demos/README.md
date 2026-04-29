# demos/

Real-world examples. Each demo ships in **two equivalent forms** — pick whichever you prefer:

- `<demo>.pts` — uses parabun's syntax sugar (`effect { }`, `signal X = …`, `~>`, `\|>`, `..=`, `pure function`). Shorter.
- `<demo>.ts` — plain TypeScript with the desugared runtime calls (`signals.effect(() => …)`, `signals.signal(…)`, etc.). Identical behavior.

Not everyone wants to leave TypeScript and that's 100% ok — every demo runs with whichever extension you pick.

| Demo | What | Hardware / fixtures |
|---|---|---|
| `iot-button-led` ([.pts](iot-button-led.pts) / [.ts](iot-button-led.ts)) | Reactive button → LED — `chip.line({ pollHz: 50 })` drives `button.value`, one `effect` block does the whole control loop | Linux SBC + GPIO. |
| `iot-bank-mirror` ([.pts](iot-bank-mirror.pts) / [.ts](iot-bank-mirror.ts)) | 4-button bank → 4-LED bank via `chip.bank({ pollHz: 50 })` and one `effect` over `buttons.value: Signal<bigint>` | Linux SBC + GPIO. |
| `iot-http-state` ([.pts](iot-http-state.pts) / [.ts](iot-http-state.ts)) | Live GPIO state over HTTP — `/state` (JSON), `/events` (SSE), `POST /led/0\|1\|auto` for override. One `effect` writes the LED AND broadcasts to SSE clients | Linux SBC + GPIO + HTTP. |
| `iot-sensor` ([.pts](iot-sensor.pts) / [.ts](iot-sensor.ts)) | Periodic sensor read → derived threshold → reactive log via `signals.fromInterval` + `derived` + `effect`. Same shape as a real i2c sensor with `sensor.smbus.readWord(...)` | None — simulated sensor. |
| `iot-dashboard` ([.pts](iot-dashboard.pts) / [.ts](iot-dashboard.ts)) | Simulated IoT control panel — `signal` declarations, auto-derived state, `effect`, `~> ... when ...` reactive binding (or `signals.effect(...)` writing into a property in TypeScript form) | None — pure simulation. |
| `gpio-blink` ([.pts](gpio-blink.pts) / [.ts](gpio-blink.ts)) | Imperative LED blink + button-press exit using `for await (e of button.edges())` | Linux SBC + GPIO. `--seconds N` runs non-interactively. |
| `i2c-scan` ([.pts](i2c-scan.pts) / [.ts](i2c-scan.ts)) | List every i2c bus + scan for ack'ing devices | Linux + `i2c-dev`. Skips buses the user doesn't have permission for. |
| `csv-pipeline` ([.pts](csv-pipeline.pts) / [.ts](csv-pipeline.ts)) | Parse a CSV, summarise the first numeric column. `.pts` threads the helpers with `\|>`; `.ts` calls them directly | None — pass any CSV path. |
| `image-batch-resize` ([.pts](image-batch-resize.pts) / [.ts](image-batch-resize.ts)) | Decode → resize → encode a directory of images via `parallel.pmap` worker pool | None — pass `<inDir> <outDir> <maxEdge>`. |
| `audio-meter` ([.pts](audio-meter.pts) / [.ts](audio-meter.ts)) | Live mic peak meter — `effect` over `mic.peakLevel` | ALSA / CoreAudio / WASAPI input. |
| `llm-chat` ([.pts](llm-chat.pts) / [.ts](llm-chat.ts)) | Stream tokens from a GGUF Llama checkpoint, report tokens-per-second | `LLM_FIXTURE=<path>.gguf`. |
| `whisper-transcribe` ([.pts](whisper-transcribe.pts) / [.ts](whisper-transcribe.ts)) | Transcribe a WAV via `bun:speech` (Whisper backend). `.pts` uses `..=`; `.ts` uses `await` | `WHISPER_MODEL=<path>/ggml-*.bin`, plus a 16 kHz mono WAV. |
| `assistant-3line` ([.pts](assistant-3line.pts) / [.ts](assistant-3line.ts)) | Voice assistant with tools dispatch (mic → STT → LLM → TTS → speaker) | LLM gguf + Whisper bin + Piper onnx. |

Four of the demos (`gpio-blink`, `i2c-scan`, `llm-chat`, `image-batch-resize`) use no parabun-specific sugar at all, so the `.pts` and `.ts` files are byte-identical apart from the extension — the dual listing is just so you can pick either one without breaking convention.

## Running

```sh
bun run build:release demos/<demo>.pts [args]   # parabun form
bun run build:release demos/<demo>.ts  [args]   # TypeScript form
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
| `iot-http-state` | Pi 5 | ✅ Bun.serve + parabun signals; GET /state, POST /led/{0,1,auto}, override flow validated. SIGINT stops cleanly. |
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
