// Generate a deterministic ~50 MB CSV fixture with NO quoted cells so the
// parallel parser's pre-scan engages its fast chunk-and-fork path. Layout:
//   id,first,last,age,city,zip,score
// 7 columns, ~80 bytes per row → ~650k rows for ~50 MB.
//
//   bun run bench/parabun-csv-parallel/seed.ts

import { writeFileSync } from "node:fs";

const TARGET_BYTES = 50 * 1024 * 1024;
const HERE = new URL(".", import.meta.url).pathname;
const OUT = `${HERE}fixture.csv`;

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

const rng = lcg(0xdeadbeef);
function pick<T>(xs: T[]): T {
  return xs[rng() % xs.length];
}

const header = "id,first,last,age,city,zip,score\n";
const chunks: string[] = [header];
let total = header.length;
let id = 0;
while (total < TARGET_BYTES) {
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
writeFileSync(OUT, out);
console.log(`wrote ${OUT}`);
console.log(`bytes: ${out.length.toLocaleString()}`);
console.log(`rows : ${id.toLocaleString()}`);
