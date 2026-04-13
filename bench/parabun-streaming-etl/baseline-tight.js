// Baseline B: hand-rolled tight loop. No allocations, no intermediate
// arrays, inlined affine math. This is what a performance-conscious
// engineer writes — and it's what Parabun's pipeline fusion should
// automatically produce from readable |> chains.

import { generate, N } from "./gen.js";

const data = generate();

const t0 = Bun.nanoseconds();
let total = 0;
for (let i = 0; i < N; i++) {
  total += (data[i] * 1000 + 2.5) * 0.998;
}
const ms = (Bun.nanoseconds() - t0) / 1e6;

console.log(`baseline-tight score_ms=${ms.toFixed(2)} total=${total.toFixed(4)} n=${N}`);
