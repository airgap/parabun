// Baseline: real LangChain MemoryVectorStore (FakeVectorStore in
// @langchain/core's testing utils — the canonical in-memory cosine search
// used in tutorials, RAG demos, and tests).
//
// Embeddings is just a placeholder — we feed pre-computed vectors via
// addVectors(), exactly as a production pipeline would after calling an
// embedding model.

import { FakeVectorStore } from "@langchain/core/utils/testing";
import { Document } from "@langchain/core/documents";
import { Embeddings } from "@langchain/core/embeddings";
import { generate, N, K } from "./gen.ts";

class NoopEmbeddings extends Embeddings {
  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map(() => []);
  }
  async embedQuery(_text: string): Promise<number[]> {
    return [];
  }
}

const tGen0 = Bun.nanoseconds();
const { vectors, queryArr } = generate();
const docs = vectors.map((_, i) => new Document({ pageContent: `doc-${i}`, metadata: { id: i } }));
const genMs = (Bun.nanoseconds() - tGen0) / 1e6;

const tAdd0 = Bun.nanoseconds();
const store = new FakeVectorStore(new NoopEmbeddings({}));
await store.addVectors(vectors, docs);
const addMs = (Bun.nanoseconds() - tAdd0) / 1e6;

const tScore0 = Bun.nanoseconds();
const results = await store.similaritySearchVectorWithScore(queryArr, K);
const scoreMs = (Bun.nanoseconds() - tScore0) / 1e6;

const topStr = results.map(([doc, score]) => `${doc.metadata.id}:${score.toFixed(4)}`).join(",");
console.log(
  `langchain gen_ms=${genMs.toFixed(2)} add_ms=${addMs.toFixed(2)} score_ms=${scoreMs.toFixed(2)} total_ms=${(genMs + addMs + scoreMs).toFixed(2)} top=[${topStr}]`,
);
