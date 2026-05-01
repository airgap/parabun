// Voice assistant with tool dispatch — parabun:assistant. (TypeScript form.)
//
//   ASSISTANT_LLM=/path/to/Llama-3.2-1B-Instruct-Q4_K_M.gguf \
//   ASSISTANT_STT=/path/to/ggml-tiny.en.bin \
//   ASSISTANT_TTS=/path/to/en_US-lessac-medium.onnx \
//     bun run build:release demos/assistant-3line.ts
//
// Same demo as assistant-3line.pts; the parabun `A -> fn` reactive
// call-binding becomes `signals.effect(() => fn(A))` here. Identical
// behavior.

import assistant from "parabun:assistant";
import signals from "para:signals";
import { existsSync } from "node:fs";

const llm = process.env.ASSISTANT_LLM;
const stt = process.env.ASSISTANT_STT;
const tts = process.env.ASSISTANT_TTS;

for (const [name, path] of Object.entries({
  ASSISTANT_LLM: llm,
  ASSISTANT_STT: stt,
  ASSISTANT_TTS: tts,
})) {
  if (!path || !existsSync(path)) {
    console.error(`set ${name}=<path> — missing or doesn't exist`);
    process.exit(1);
  }
}

await using bot = await assistant.create({
  llm: llm!,
  stt: stt!,
  tts: tts!,
  system: "You are a concise voice assistant. Answer in one or two sentences.",
  tools: {
    setLight: ({ room, on, brightness }) =>
      console.log(`\n[tool] light ${room} ${on ? "on" : "off"} @ ${brightness ?? 100}`),
    playMusic: ({ track }) => console.log(`\n[tool] play ${track}`),
  },
});

signals.effect(() => process.stdout.write(`\r[${bot.state.get().padEnd(10)}]`));

await bot.run();
