import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

// parabun:speech.wakeWord coverage (LYK-739).
//
// Two tiers:
//   1. matchWakePhrase() — pure string match, no whisper, runs anywhere.
//   2. wakeWord() — full pipe with a real Whisper model. Skipped without
//      both a ggml-*.bin and a recognizable speech wav fixture.
//
// JFK's "ask not what your country can do for you, ask what you can do for
// your country" is the canonical fixture under .cache/whisper/jfk.wav —
// the phrase "fellow Americans" appears verbatim, so a wake-word stream
// configured for it should fire exactly once on that recording.

const whisperCandidates = [process.env.WAKEWORD_WHISPER, "/raid/parabun/.cache/whisper/ggml-tiny.en.bin"].filter(
  (p): p is string => Boolean(p),
);
const whisperFixture = whisperCandidates.find(p => existsSync(p));

const wavCandidates = [process.env.WAKEWORD_WAV, "/raid/parabun/.cache/whisper/jfk.wav"].filter((p): p is string =>
  Boolean(p),
);
const wavFixture = wavCandidates.find(p => existsSync(p));

const haveFixtures = Boolean(whisperFixture && wavFixture);

describe("parabun:speech.matchWakePhrase", () => {
  test("contains: case-insensitive substring", async () => {
    const speech = (await import("parabun:speech")).default;
    expect(speech.matchWakePhrase("Hey Jetson, what's the time?", "hey jetson")).toMatchObject({
      phrase: "hey jetson",
      confidence: 1,
    });
    expect(speech.matchWakePhrase("HEY JETSON!", "hey jetson")).toMatchObject({ phrase: "hey jetson" });
    expect(speech.matchWakePhrase("hello there", "hey jetson")).toBeNull();
  });

  test("contains: punctuation is normalized away", async () => {
    const speech = (await import("parabun:speech")).default;
    // Whisper often spits commas/periods/quotes inside utterances.
    expect(speech.matchWakePhrase('"Hey, Jetson." ...what time is it?', "hey jetson")).toMatchObject({
      phrase: "hey jetson",
    });
  });

  test("multiple phrases — first match wins", async () => {
    const speech = (await import("parabun:speech")).default;
    const m = speech.matchWakePhrase("ok google what's up", ["hey jetson", "ok google", "alexa"]);
    expect(m).toMatchObject({ phrase: "ok google", confidence: 1 });
  });

  test("exact: requires whole-string equality", async () => {
    const speech = (await import("parabun:speech")).default;
    expect(speech.matchWakePhrase("hey jetson", "hey jetson", "exact")).toMatchObject({
      phrase: "hey jetson",
    });
    expect(speech.matchWakePhrase("hey jetson, what's up", "hey jetson", "exact")).toBeNull();
  });

  test("fuzzy: tolerates a couple Whisper-ish slips", async () => {
    const speech = (await import("parabun:speech")).default;
    // Whisper transcribes "hey jetson" as "hey jetsen" or "ay jetson" sometimes.
    expect(speech.matchWakePhrase("hey jetsen", "hey jetson", "fuzzy", 2)).toMatchObject({
      phrase: "hey jetson",
    });
    expect(speech.matchWakePhrase("ay jetson", "hey jetson", "fuzzy", 2)).toMatchObject({
      phrase: "hey jetson",
    });
    // Far enough off → no match.
    expect(speech.matchWakePhrase("howdy partner", "hey jetson", "fuzzy", 2)).toBeNull();
  });

  test("fuzzy: confidence scales with edits", async () => {
    const speech = (await import("parabun:speech")).default;
    const exact = speech.matchWakePhrase("hey jetson", "hey jetson", "fuzzy", 4);
    const oneOff = speech.matchWakePhrase("hey jetsen", "hey jetson", "fuzzy", 4);
    expect(exact!.confidence).toBe(1);
    expect(oneOff!.confidence).toBeLessThan(1);
    expect(oneOff!.confidence).toBeGreaterThan(0);
  });

  test("fuzzy: sliding window handles trailing words", async () => {
    const speech = (await import("parabun:speech")).default;
    // "hey jetson" embedded in a longer transcription with one slip.
    expect(speech.matchWakePhrase("ay jetson what's the weather", "hey jetson", "fuzzy", 2)).toMatchObject({
      phrase: "hey jetson",
    });
  });

  test("empty / non-string input returns null", async () => {
    const speech = (await import("parabun:speech")).default;
    expect(speech.matchWakePhrase("", "hey jetson")).toBeNull();
    expect(speech.matchWakePhrase("   ", "hey jetson")).toBeNull();
    // @ts-expect-error — exercising guard
    expect(speech.matchWakePhrase(null, "hey jetson")).toBeNull();
  });
});

describe("parabun:speech.wakeWord (real whisper)", () => {
  test.skipIf(!haveFixtures)(
    "fires on a phrase present in the JFK wav",
    async () => {
      const speech = (await import("parabun:speech")).default;
      const audio = (await import("parabun:audio")).default;
      const wavBytes = new Uint8Array(await Bun.file(wavFixture!).arrayBuffer());
      const wav = audio.readWav(wavBytes);

      // Emit the full wav as one chunk — listen() will VAD-segment it into
      // utterances internally. Sample rate is whatever the file carries
      // (jfk.wav is 16 kHz mono).
      async function* once() {
        yield { samples: wav.samples };
      }

      const stream = speech.wakeWord({
        source: once(),
        whisper: whisperFixture!,
        phrase: "fellow americans",
        sampleRate: wav.sampleRate,
      });

      const triggers: { phrase: string; transcription: string }[] = [];
      for await (const t of stream) {
        triggers.push({ phrase: t.phrase, transcription: t.transcription });
      }
      expect(triggers.length).toBeGreaterThanOrEqual(1);
      expect(triggers[0].phrase).toBe("fellow americans");
      expect(triggers[0].transcription.toLowerCase()).toContain("fellow americans");
    },
    120000,
  );

  test.skipIf(!haveFixtures)(
    "stays silent when the wake phrase isn't in the audio",
    async () => {
      const speech = (await import("parabun:speech")).default;
      const audio = (await import("parabun:audio")).default;
      const wavBytes = new Uint8Array(await Bun.file(wavFixture!).arrayBuffer());
      const wav = audio.readWav(wavBytes);

      async function* once() {
        yield { samples: wav.samples };
      }

      const stream = speech.wakeWord({
        source: once(),
        whisper: whisperFixture!,
        // JFK's speech doesn't contain this phrase.
        phrase: "compute the magnetosphere",
        sampleRate: wav.sampleRate,
      });

      const triggers: { phrase: string }[] = [];
      for await (const t of stream) {
        triggers.push({ phrase: t.phrase });
      }
      expect(triggers.length).toBe(0);
    },
    120000,
  );
});
