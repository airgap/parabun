import { describe, expect, test } from "bun:test";
import { tempDir } from "harness";
import { existsSync } from "node:fs";

// RAG / knowledge-store coverage (LYK-738). Three layers:
//   1. chunkText() — pure function, no encoder needed.
//   2. KnowledgeStore — tested with a deterministic mock encoder so the
//      retrieval semantics are exercised without a real model.
//   3. assistant.create({ knowledge }) — same mock encoder; verifies
//      the option is accepted and bot.knowledge points at the store.

const llmCandidates = [
  process.env.ASSISTANT_LLM,
  "/rigil/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
  "/raid/parabun-fixtures/llm/Llama-3.2-1B-Instruct-Q8_0.gguf",
].filter((p): p is string => Boolean(p));
const llmFixture = llmCandidates.find(p => existsSync(p));
const haveLLM = Boolean(llmFixture);

// ─── Mock encoder ──────────────────────────────────────────────────────────
//
// Maps each text to a 4-dim "topic" vector. Each topic word in the text
// (cats / dogs / rust / python) bumps its coordinate; the result is L2-
// normalized. This gives texts that share a topic high cosine similarity
// even though there's no real semantic embedding behind it.
function mockEncoder() {
  const TOPICS = ["cats", "dogs", "rust", "python"];
  return {
    embed(text: string): Float32Array {
      const lower = text.toLowerCase();
      const v = new Float32Array(TOPICS.length);
      for (let i = 0; i < TOPICS.length; i++) {
        // Crude word-count using regex word boundaries.
        const re = new RegExp(`\\b${TOPICS[i]}\\b`, "g");
        const matches = lower.match(re);
        v[i] = matches ? matches.length : 0;
      }
      // Smooth so an unrelated text still has a tiny non-zero component
      // (avoid all-zero query vectors that fail normalization).
      for (let i = 0; i < v.length; i++) v[i] += 0.01;
      let norm = 0;
      for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
      norm = Math.sqrt(norm);
      for (let i = 0; i < v.length; i++) v[i] /= norm;
      return v;
    },
  };
}

describe("para:assistant chunkText (LYK-738)", () => {
  test("splits on blank-line boundaries, preserves offsets", async () => {
    const a = (await import("para:assistant")).default;
    const out = a.chunkText("one\n\ntwo\n\nthree");
    expect(out.map(c => c.text)).toEqual(["one", "two", "three"]);
    expect(out[0].offset).toBe(0);
    expect(out[1].offset).toBe(5); // after "one\n\n"
    expect(out[2].offset).toBe(10); // after "one\n\ntwo\n\n"
  });

  test("normalizes \\r\\n and trims whitespace per chunk", async () => {
    const a = (await import("para:assistant")).default;
    const out = a.chunkText("alpha\r\n\r\n  beta  \r\n\r\ngamma");
    expect(out.map(c => c.text)).toEqual(["alpha", "beta", "gamma"]);
  });

  test("breaks long paragraphs into overlapping chunks", async () => {
    const a = (await import("para:assistant")).default;
    const long = "x".repeat(2000);
    const out = a.chunkText(long, { chunkSize: 500, chunkOverlap: 100 });
    // step = 400; expected windows at 0, 400, 800, 1200, 1600.
    expect(out.length).toBe(5);
    for (const c of out) expect(c.text.length).toBeLessThanOrEqual(500);
    // Successive chunks overlap by 100 chars on the leading edge.
    expect(out[1].offset - out[0].offset).toBe(400);
  });

  test("drops empty input, returns empty array", async () => {
    const a = (await import("para:assistant")).default;
    expect(a.chunkText("")).toEqual([]);
    expect(a.chunkText("   \n\n\n   ")).toEqual([]);
  });
});

describe("para:assistant KnowledgeStore (LYK-738)", () => {
  test("indexes a directory, returns top-k by cosine", async () => {
    const a = (await import("para:assistant")).default;
    using dir = tempDir("rag-knowledge", {
      "cats.md": "Cats are independent animals. They love to nap in the sun.\n",
      "dogs.md": "Dogs are loyal companions. They love long walks.\n",
      "rust.md": "Rust prevents memory bugs at compile time. The borrow checker enforces ownership.\n",
      "python.md": "Python is a dynamic interpreted language. Excellent for scripting and data work.\n",
    });

    const store = await a.KnowledgeStore.create({
      dir: String(dir),
      encoder: mockEncoder(),
      watch: false,
    });
    try {
      expect(store.count).toBe(4);
      expect(store.dim).toBe(4);

      // Cat-flavored query → cats.md should be top hit.
      const hits = store.search("Tell me about cats", 2);
      expect(hits.length).toBe(2);
      expect(hits[0].path).toContain("cats.md");
      expect(hits[0].score).toBeGreaterThan(hits[1].score);

      // Rust query → rust.md tops.
      const rustHits = store.search("How does the rust borrow checker work?", 1);
      expect(rustHits[0].path).toContain("rust.md");
    } finally {
      await store.close();
    }
  });

  test("walks subdirectories", async () => {
    const a = (await import("para:assistant")).default;
    using dir = tempDir("rag-nested", {
      "top.md": "Top level note about cats.",
      "sub/inner.md": "Nested note about dogs.",
      "sub/deep/deeper.md": "Deeply nested note about rust.",
    });
    const store = await a.KnowledgeStore.create({ dir: String(dir), encoder: mockEncoder(), watch: false });
    try {
      expect(store.count).toBe(3);
    } finally {
      await store.close();
    }
  });

  test("respects extensions option — non-listed files are skipped", async () => {
    const a = (await import("para:assistant")).default;
    using dir = tempDir("rag-extensions", {
      "good.md": "Cats and dogs.",
      "skipped.json": '{"about": "cats and dogs"}',
      "alsogood.txt": "More about cats.",
    });
    const store = await a.KnowledgeStore.create({
      dir: String(dir),
      encoder: mockEncoder(),
      extensions: [".md", ".txt"],
    });
    try {
      expect(store.count).toBe(2);
      const all = store.search("cats", 5);
      for (const h of all) {
        expect(h.path.endsWith(".md") || h.path.endsWith(".txt")).toBe(true);
      }
    } finally {
      await store.close();
    }
  });

  test("skips dotfiles and dotdirs (.git, .obsidian)", async () => {
    const a = (await import("para:assistant")).default;
    using dir = tempDir("rag-dotskip", {
      "real.md": "real note about cats",
      ".obsidian/config.md": "obsidian config noise about cats",
      ".git/HEAD.md": "git internal noise about cats",
    });
    const store = await a.KnowledgeStore.create({ dir: String(dir), encoder: mockEncoder(), watch: false });
    try {
      expect(store.count).toBe(1);
      expect(store.search("cats", 1)[0].path).toContain("real.md");
    } finally {
      await store.close();
    }
  });

  test("skips files larger than maxFileBytes", async () => {
    const a = (await import("para:assistant")).default;
    const huge = "cats ".repeat(50000); // ~250KB
    using dir = tempDir("rag-size", {
      "small.md": "tiny cats note",
      "huge.md": huge,
    });
    const store = await a.KnowledgeStore.create({
      dir: String(dir),
      encoder: mockEncoder(),
      maxFileBytes: 1024, // 1 KB cap; only small.md fits
    });
    try {
      expect(store.count).toBe(1);
    } finally {
      await store.close();
    }
  });

  test("rejects when dir doesn't exist", async () => {
    const a = (await import("para:assistant")).default;
    await expect(
      a.KnowledgeStore.create({ dir: "/definitely/not/a/real/path/xyz", encoder: mockEncoder(), watch: false }),
    ).rejects.toThrow(/directory not found/);
  });

  test("rejects bad encoder shape", async () => {
    const a = (await import("para:assistant")).default;
    using dir = tempDir("rag-bad-encoder", { "x.md": "hello" });
    await expect(
      // @ts-expect-error — exercising the runtime guard
      a.KnowledgeStore.create({ dir: String(dir), encoder: 42 }),
    ).rejects.toThrow(/encoder/);
  });

  test("reindex picks up new files", async () => {
    const a = (await import("para:assistant")).default;
    using dir = tempDir("rag-reindex", {
      "first.md": "Initial note about cats.",
    });
    const store = await a.KnowledgeStore.create({ dir: String(dir), encoder: mockEncoder(), watch: false });
    try {
      expect(store.count).toBe(1);

      // Drop a new file in (simulate user adding to the corpus).
      const fs = require("node:fs");
      const path = require("node:path");
      fs.writeFileSync(path.join(String(dir), "second.md"), "Second note about dogs.");

      await store.reindex();
      expect(store.count).toBe(2);
    } finally {
      await store.close();
    }
  });

  test("close() makes search() throw", async () => {
    const a = (await import("para:assistant")).default;
    using dir = tempDir("rag-close", { "x.md": "cats" });
    const store = await a.KnowledgeStore.create({ dir: String(dir), encoder: mockEncoder(), watch: false });
    await store.close();
    expect(() => store.search("cats")).toThrow(/disposed/);
  });

  test("returns empty array on empty index", async () => {
    const a = (await import("para:assistant")).default;
    using dir = tempDir("rag-empty", { "skipped.json": "not indexed" });
    const store = await a.KnowledgeStore.create({ dir: String(dir), encoder: mockEncoder(), watch: false });
    try {
      expect(store.count).toBe(0);
      expect(store.search("cats")).toEqual([]);
    } finally {
      await store.close();
    }
  });
});

describe("para:assistant `knowledge` option (LYK-738)", () => {
  test("accepts pre-loaded encoder + exposes bot.knowledge", async () => {
    if (!haveLLM) return;
    const a = (await import("para:assistant")).default;
    using dir = tempDir("rag-bot", {
      "rust.md": "Rust ownership rules.",
      "python.md": "Python list comprehensions.",
    });
    const bot = await a.create({
      llm: llmFixture!,
      knowledge: { dir: String(dir), encoder: mockEncoder(), topK: 2, watch: false },
    });
    try {
      expect(bot.knowledge).not.toBeNull();
      expect(bot.knowledge!.count).toBe(2);
      // Direct search via the public surface still works.
      const hits = bot.knowledge!.search("rust borrow checker");
      expect(hits.length).toBeGreaterThanOrEqual(1);
      expect(hits[0].path).toContain("rust.md");
    } finally {
      await bot.close();
    }
  }, 60000);

  test("bot.knowledge is null when no knowledge option passed", async () => {
    if (!haveLLM) return;
    const a = (await import("para:assistant")).default;
    const bot = await a.create({ llm: llmFixture! });
    try {
      expect(bot.knowledge).toBeNull();
    } finally {
      await bot.close();
    }
  }, 60000);
});
