# demos/

Real-world examples. Each demo ships in **two equivalent forms** — pick whichever you prefer:

- `<demo>.pts` — uses parabun's syntax sugar (`effect { }`, `signal X = …`, `~>`, `\|>`, `pure function`). Shorter.
- `<demo>.ts` — plain TypeScript with the desugared runtime calls (`signals.effect(() => …)`, `signals.signal(…)`, etc.). Identical behavior.

Not everyone wants to leave TypeScript and that's 100% ok — every demo runs with whichever extension you pick.

| Demo | What | Hardware / fixtures |
|---|---|---|
| `iot-button-led` ([.pts](iot-button-led.pts) / [.ts](iot-button-led.ts)) | Reactive button → LED — `chip.line({ pollHz: 50 })` drives `button.value`, one `-> led.write` call-binding handles the whole control loop | Linux SBC + GPIO. |
| `iot-bank-mirror` ([.pts](iot-bank-mirror.pts) / [.ts](iot-bank-mirror.ts)) | 4-button bank → 4-LED bank via `chip.bank({ pollHz: 50 })` and one `-> leds.write` call-binding over `buttons.value: Signal<bigint>` | Linux SBC + GPIO. |
| `iot-http-state` ([.pts](iot-http-state.pts) / [.ts](iot-http-state.ts)) | Live GPIO state over HTTP — `/state` (JSON), `/events` (SSE), `POST /led/0\|1\|auto` for override. One `effect` writes the LED AND broadcasts to SSE clients | Linux SBC + GPIO + HTTP. |
| `iot-sensor` ([.pts](iot-sensor.pts) / [.ts](iot-sensor.ts)) | Periodic sensor read → derived threshold → reactive log via `signals.fromInterval` + `derived` + `effect`. Same shape as a real i2c sensor with `sensor.smbus.readWord(...)` | None — simulated sensor. |
| `iot-temp-warn` ([.pts](iot-temp-warn.pts) / [.ts](iot-temp-warn.ts)) | Pi CPU temp → warn / error thresholds → 2 LEDs + transition log. `--warn 65 --error 75` defaults; logs only when level changes | Linux SBC + GPIO (BCM17 warn / BCM27 err). Reads `/sys/class/thermal/thermal_zone0/temp` — no extra wiring on the sensor side. |
| `iot-waterer` ([.pts](iot-waterer.pts) / [.ts](iot-waterer.ts)) | Multi-plant auto waterer: per-plant moisture signal → dry-threshold → pump pulse → cooldown FSM, plus a tank-level sensor on a 4th ADC channel that pauses all watering when empty and notifies on the empty / refilled / low-water transitions via `when` (the .pts version uses `when tankEmpty { … }` + `when not tankEmpty { … }`; the .ts version tracks the previous value by hand). 3 example plants. `--simulate` works on any host; `--i2c <bus>` uses real ADS1115; `--demo-empty` drains the simulated tank fast so the alert cycle fires in seconds. | Optional. Real mode: I²C ADS1115 @ 0x48 (channels 0..2 = moisture, ch 3 = tank level) + GPIO relay per plant (BCM17 / 27 / 22). |
| `iot-dashboard` ([.pts](iot-dashboard.pts) / [.ts](iot-dashboard.ts)) | Simulated IoT control panel — `signal` declarations, auto-derived state, `effect`, `~> ... when ...` reactive binding (or `signals.effect(...)` writing into a property in TypeScript form) | None — pure simulation. |
| `gpio-blink` ([.pts](gpio-blink.pts) / [.ts](gpio-blink.ts)) | Imperative LED blink + button-press exit using `for await (e of button.edges())` | Linux SBC + GPIO. `--seconds N` runs non-interactively. |
| `i2c-scan` ([.pts](i2c-scan.pts) / [.ts](i2c-scan.ts)) | List every i2c bus + scan for ack'ing devices | Linux + `i2c-dev`. Skips buses the user doesn't have permission for. |
| `csv-pipeline` ([.pts](csv-pipeline.pts) / [.ts](csv-pipeline.ts)) | Parse a CSV, summarise the first numeric column. `.pts` threads the helpers with `\|>`; `.ts` calls them directly | None — pass any CSV path. |
| `image-batch-resize` ([.pts](image-batch-resize.pts) / [.ts](image-batch-resize.ts)) | Decode → resize → encode a directory of images via `parallel.pmap` worker pool | None — pass `<inDir> <outDir> <maxEdge>`. |
| `audio-meter` ([.pts](audio-meter.pts) / [.ts](audio-meter.ts)) | Live mic peak meter — `effect` over `mic.peakLevel` | ALSA / CoreAudio / WASAPI input. |
| `llm-chat` ([.pts](llm-chat.pts) / [.ts](llm-chat.ts)) | Stream tokens from a GGUF Llama checkpoint, report tokens-per-second | `LLM_FIXTURE=<path>.gguf`. |
| `whisper-transcribe` ([.pts](whisper-transcribe.pts) / [.ts](whisper-transcribe.ts)) | Transcribe a WAV via `parabun:speech` (Whisper backend). | `WHISPER_MODEL=<path>/ggml-*.bin`, plus a 16 kHz mono WAV. |
| `assistant-3line` ([.pts](assistant-3line.pts) / [.ts](assistant-3line.ts)) | Voice assistant with tools dispatch (mic → STT → LLM → TTS → speaker) | LLM gguf + Whisper bin + Piper onnx. |
| `video-transcribe` ([.ts](video-transcribe.ts)) | End-to-end video → text: `video.extractAudio` → Whisper → stdout. Works on any container ffmpeg knows | `WHISPER_MODEL=<path>/ggml-*.bin` + `ffmpeg`. |
| `camera-motion` ([.ts](camera-motion.ts)) | Smart-camera surveillance: V4L2 capture → `vision.detectMotion` → save JPEG snapshots when motion fires | Linux + `/dev/video0` USB cam. |
| `parquet-etl` ([.ts](parquet-etl.ts)) | Synthetic 100K-row → Parquet (zstd + bloom on `user_id`/`region`) → 3 queries demonstrating bloom skip + stats pushdown | None — self-contained. |
| `llm-serve` ([.ts](llm-serve.ts)) | OpenAI-compatible HTTP proxy in 12 lines (ollama-default port 11434). Drop-in for any OpenAI SDK / curl client | `LLM_FIXTURE=<path>.gguf`. |
| `streaming-etl` ([.pts](streaming-etl.pts) / [.ts](streaming-etl.ts)) | 10M-element ETL pipeline: showcases `\|>` operator fusion collapsing 2 affine transforms + sum into one SIMD pass; reports speedup vs naive `.map().reduce()` | None — synthetic. |

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
| `iot-button-led` | Pi 5 | ✅ chip.line({pollHz:50}) drives button.value, one `-> led.write` call-binding writes LED. 2 s non-interactive run. |
| `iot-bank-mirror` | Pi 5 | ✅ chip.bank({pollHz:50}) drives 4-bit Signal<bigint>; one `-> leds.write` call-binding mirrors buttons → LEDs in a single bitwise expression. |
| `iot-http-state` | Pi 5 | ✅ Bun.serve + parabun signals; GET /state, POST /led/{0,1,auto}, override flow validated. SIGINT stops cleanly. |
| `iot-sensor` | dev box | ✅ fromInterval drives signal at 5 Hz, derived recomputes isHot, effect logs threshold crossings. |
| `iot-temp-warn` | dev box | ✅ both .pts and .ts parse + run; gpio.open() correctly errors out when the chip path is invalid. Pi-side validation pending hardware run. |
| `iot-waterer` | dev box | ✅ both .pts and .ts run in `--simulate` mode; per-plant FSM correctly transitions ok→watering→cooldown→ok with the 0.05/tick oscillator (succulent triggers at 18%). Pi-side validation with a real ADS1115 + relays pending hardware run. |
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
- `effect { … }` — block sugar for `signals.effect(() => …)`. Tracks every signal it reads. (`iot-http-state.pts`, `iot-dashboard.pts`, `audio-meter.pts`)
- `A ~> B [when C]` — reactive **assignment** binding. Re-evaluates `A` and writes into `B` whenever the deps change; optional `when` guard. (`iot-dashboard.pts`)
- `A -> fn [when C]` — reactive **call** binding. Re-evaluates `A` and re-calls `fn(A)` whenever the deps change. Same precedence and `when` shape as `~>`. (`iot-button-led.pts`, `iot-bank-mirror.pts`, `assistant-3line.pts`)
- `pure function …` — parse-time purity check (`csv-pipeline.pts`)
- `|>` pipeline — `csv-pipeline.pts`
- `await using` — every demo holding a kernel resource (gpio chip / i2c bus / LLM model)
- `for await (… of …)` — token streams (`llm-chat.pts`), edge events (`gpio-blink.pts`), audio frames (`audio-meter.pts`)

## Reactive shape — what makes IoT simple here

Three primitives carry the full IoT story:

- **`chip.line({ pollHz: N })`** / **`chip.bank({ pollHz: N })`** — driver-level polling baked into parabun:gpio so `line.value` / `bank.value` update on hardware change without the caller wiring `setInterval`.
- **`signals.fromInterval(fn, periodMs)`** — the same shape for any periodic source. Wraps `i2c.smbus.readWord(...)` / `dev.read(...)` / a custom HTTP poll into a `Signal` with one call.
- **`effect { … }`** + **`derived(() => …)`** — the reaction surface. Every signal read inside is tracked automatically; the body re-runs on any change.

Common pattern, three lines:

```parabun
const sensor = signals.fromInterval(() => dev.smbus.readWord(0xFA), 500);
const isHot = derived(() => (sensor.signal.get() ?? 0) > 80);
effect { if (isHot.get()) console.log("HOT"); }
```

Same shape works for GPIO inputs, audio levels, network polls — anywhere a value changes over time.

## Known limitation: parabun:gpio edge events

`line.edges()` calls a synchronous blocking `read()` on the kernel-event fd, which currently runs on the JS main thread — so it can't be drained in the background while another reactive control loop runs in parallel. The IoT demos use `pollHz` (poll-based) instead. Filed as LYK-786 to move `readEvent` off-thread; once that ships, `edge: "..."` will drive `line.value` at hardware-event latency too.
