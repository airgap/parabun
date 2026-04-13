// Head-to-head: real LangChain MemoryVectorStore vs drop-in
// ParabunVectorStore. Same input vectors, same query, same k. Verifies
// top-K is identical (modulo float-precision tie-ordering).
//
//   bun run build:release bench/parabun-rag-retrieval/run.ts

import { spawnSync } from "bun";

const HERE = new URL(".", import.meta.url).pathname;
const RUNS = 3;

const variants = [
  { name: "langchain MemoryVectorStore     ", path: `${HERE}baseline-langchain.ts` },
  { name: "ParabunVectorStore (drop-in)    ", path: `${HERE}parabun-store.pjs` },
];

type Phase = { gen: number; add: number; score: number; total: number; top: string };

function parseLine(s: string): Phase | null {
  const m = s.match(/gen_ms=([\d.]+) add_ms=([\d.]+) score_ms=([\d.]+) total_ms=([\d.]+) top=\[([^\]]*)\]/);
  if (!m) return null;
  return {
    gen: parseFloat(m[1]),
    add: parseFloat(m[2]),
    score: parseFloat(m[3]),
    total: parseFloat(m[4]),
    top: m[5],
  };
}

function stats(xs: number[]) {
  const sorted = [...xs].sort((a, b) => a - b);
  return { min: sorted[0], med: sorted[Math.floor(sorted.length / 2)], max: sorted[sorted.length - 1] };
}

function runOnce(path: string): Phase {
  const r = spawnSync([process.execPath, path], { stdout: "pipe", stderr: "pipe" });
  const out = new TextDecoder().decode(r.stdout);
  const lines = out.trim().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = parseLine(lines[i]);
    if (m) return m;
  }
  throw new Error(`no timing line in output of ${path}:\n${out}\nstderr:\n${new TextDecoder().decode(r.stderr)}`);
}

function topSet(top: string): Set<string> {
  return new Set(top.split(",").map(s => s.split(":")[0]));
}

console.log(`best-of-${RUNS} per variant — N=100,000 × D=384, K=10\n`);
console.log(
  `${"variant".padEnd(32)}\t${"add_ms (min/med/max)".padEnd(26)}\t${"score_ms (min/med/max)".padEnd(26)}\t${"total_ms (min/med/max)"}`,
);

let referenceTop: Set<string> | null = null;
let referenceTopList: string = "";
for (const v of variants) {
  const adds: number[] = [];
  const scores: number[] = [];
  const totals: number[] = [];
  let lastTop = "";
  for (let i = 0; i < RUNS; i++) {
    const m = runOnce(v.path);
    adds.push(m.add);
    scores.push(m.score);
    totals.push(m.total);
    lastTop = m.top;
  }
  const a = stats(adds);
  const s = stats(scores);
  const t = stats(totals);
  const fmt = (x: { min: number; med: number; max: number }) =>
    `${x.min.toFixed(1)} / ${x.med.toFixed(1)} / ${x.max.toFixed(1)}`.padEnd(26);
  console.log(`${v.name}\t${fmt(a)}\t${fmt(s)}\t${fmt(t)}`);

  const thisSet = topSet(lastTop);
  if (referenceTop === null) {
    referenceTop = thisSet;
    referenceTopList = lastTop;
  } else {
    let ok = thisSet.size === referenceTop.size;
    if (ok)
      for (const x of thisSet)
        if (!referenceTop.has(x)) {
          ok = false;
          break;
        }
    if (!ok) {
      console.log(`  !! top-K MISMATCH: ${lastTop}`);
      console.log(`     reference:     ${referenceTopList}`);
    }
  }
}

console.log(`\ntop-K verified matching: ${referenceTopList}`);
