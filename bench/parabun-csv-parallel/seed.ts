// Generate a deterministic CSV fixture with NO quoted cells so the parallel
// parser's pre-scan engages its fast chunk-and-fork path. Layout:
//   id,first,last,age,city,zip,score
// 7 columns, ~80 bytes per row.
//
// Usable two ways:
//   Importable — `import { generate } from "./seed.ts"; generate(50);`
//   CLI       — `bun run bench/parabun-csv-parallel/seed.ts [sizeMB]`
// CLI default is 50 MB.

import { writeFileSync } from "node:fs";

const HERE = new URL(".", import.meta.url).pathname;

const firstNames = [
  "Avery",
  "Bailey",
  "Casey",
  "Drew",
  "Emerson",
  "Finley",
  "Gray",
  "Harper",
  "Indigo",
  "Jordan",
  "Kai",
  "Logan",
  "Morgan",
  "Noel",
  "Oakley",
  "Parker",
  "Quinn",
  "Reese",
  "Sage",
  "Tatum",
  "Umber",
  "Val",
  "Wren",
  "Xan",
  "Yael",
  "Zion",
];
const lastNames = [
  "Adler",
  "Brooks",
  "Carmen",
  "Devlin",
  "Eaves",
  "Foley",
  "Granger",
  "Holm",
  "Iverson",
  "Jenks",
  "Knox",
  "Larkin",
  "Mason",
  "Nash",
  "Owens",
  "Pratt",
  "Quincey",
  "Rojas",
  "Sloan",
  "Tilden",
  "Ulmer",
  "Voss",
  "Webb",
  "York",
];
const cities = [
  "Portland",
  "Buffalo",
  "Tacoma",
  "Tucson",
  "Salem",
  "Reno",
  "Akron",
  "Fresno",
  "Boise",
  "Olympia",
  "Topeka",
  "Mobile",
  "Eugene",
  "Aurora",
];

function lcg(seed: number) {
  // Numerical Recipes parameters; deterministic per seed across hosts.
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s;
  };
}

export function fixturePath(sizeMB: number): string {
  return `${HERE}fixture-${sizeMB}MB.csv`;
}

export function generate(sizeMB: number): { path: string; bytes: number; rows: number } {
  const targetBytes = sizeMB * 1024 * 1024;
  const rng = lcg(0xdeadbeef);
  const pick = <T>(xs: T[]): T => xs[rng() % xs.length];

  const header = "id,first,last,age,city,zip,score\n";
  const chunks: string[] = [header];
  let total = header.length;
  let id = 0;
  while (total < targetBytes) {
    const first = pick(firstNames);
    const last = pick(lastNames);
    const age = 18 + (rng() % 70);
    const city = pick(cities);
    const zip = 10000 + (rng() % 89999);
    const score = ((rng() % 100000) / 1000).toFixed(3);
    const row = `${id},${first},${last},${age},${city},${zip},${score}\n`;
    chunks.push(row);
    total += row.length;
    id++;
  }

  const out = chunks.join("");
  const path = fixturePath(sizeMB);
  writeFileSync(path, out);
  return { path, bytes: out.length, rows: id };
}

// CLI entry — only run when the module is invoked directly (not imported).
if (import.meta.main) {
  const sizeMB = parseInt(process.argv[2] ?? "50", 10);
  const r = generate(sizeMB);
  console.log(`wrote ${r.path}`);
  console.log(`bytes: ${r.bytes.toLocaleString()}`);
  console.log(`rows : ${r.rows.toLocaleString()}`);
}
