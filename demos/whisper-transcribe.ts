// Transcribe a wav file with para:speech (Whisper). (TypeScript form.)
//
//   WHISPER_MODEL=/path/to/ggml-tiny.en.bin \
//     bun run build:release demos/whisper-transcribe.ts <audio.wav>
//
// Same demo as whisper-transcribe.pts; `const text ..= expr` becomes
// `const text = await expr`. Identical behavior.

import speech from "para:speech";
import audio from "para:audio";
import { existsSync } from "node:fs";

const wavPath = process.argv[2];
const modelPath = process.env.WHISPER_MODEL;
if (!wavPath || !existsSync(wavPath)) {
  console.error("usage: WHISPER_MODEL=<path> bun run demos/whisper-transcribe.ts <wav>");
  process.exit(1);
}
if (!modelPath || !existsSync(modelPath)) {
  console.error("WHISPER_MODEL must point to a ggml-*.bin file");
  process.exit(1);
}

const bytes = new Uint8Array(await Bun.file(wavPath).arrayBuffer());
const wav = audio.readWav(bytes);
console.log(
  `wav: ${wav.samples.length} samples @ ${wav.sampleRate} Hz (${(wav.samples.length / wav.sampleRate).toFixed(2)}s)`,
);

const t0 = Bun.nanoseconds();
const text = await speech.transcribe({ samples: wav.samples }, { engine: "whisper", model: modelPath });
const dtMs = (Bun.nanoseconds() - t0) / 1e6;

console.log(`\ntranscribed in ${dtMs.toFixed(0)} ms:`);
console.log(text);
