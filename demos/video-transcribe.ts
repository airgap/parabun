// Transcribe a video file end-to-end: extract its audio track, hand
// it to Whisper, dump the text to stdout.
//
//   WHISPER_MODEL=/path/to/ggml-base.en.bin \
//     bun run build:release demos/video-transcribe.ts <video.mp4>
//
// Composition demo — three modules in 20 lines:
//   parabun:video.extractAudio  → 16 kHz mono PCM
//   parabun:audio.i16ToF32      → Whisper expects float
//   parabun:speech.transcribe   → text
//
// Works for any container ffmpeg knows (mp4, mkv, webm, mov, avi, …).

import video from "parabun:video";
import audio from "parabun:audio";
import speech from "parabun:speech";
import { existsSync } from "node:fs";

const videoPath = process.argv[2];
const modelPath = process.env.WHISPER_MODEL;
if (!videoPath || !existsSync(videoPath)) {
  console.error("usage: WHISPER_MODEL=<path> bun run demos/video-transcribe.ts <video>");
  process.exit(1);
}
if (!modelPath || !existsSync(modelPath)) {
  console.error("WHISPER_MODEL must point to a ggml-*.bin file");
  process.exit(1);
}

const bytes = new Uint8Array(await Bun.file(videoPath).arrayBuffer());
console.log(`pulling audio from ${videoPath}…`);

const t0 = Bun.nanoseconds();
const pcm = await video.extractAudio(bytes, { sampleRate: 16000, channels: 1 });
const audioMs = (Bun.nanoseconds() - t0) / 1e6;
console.log(
  `extracted ${pcm.samples.length} samples (${(pcm.durationMs / 1000).toFixed(1)}s of audio) in ${audioMs.toFixed(0)}ms`,
);

const t1 = Bun.nanoseconds();
const text = await speech.transcribe(
  { samples: audio.i16ToF32(pcm.samples), sampleRate: pcm.sampleRate },
  { engine: "whisper", model: modelPath },
);
const sttMs = (Bun.nanoseconds() - t1) / 1e6;

console.log(`\ntranscribed in ${sttMs.toFixed(0)}ms:\n`);
console.log(text);
