import { test, expect } from "bun:test";
import { lowerPuiReactivity } from "../src/index.ts";

const lower = (s: string) => lowerPuiReactivity(s, "@lyku/para-ui", false, false);

test("derived NAME { … } → $derived.by(() => { … }) (multi-statement)", () => {
  const out = lower(`<script lang="ts">
derived rows {
  const f = items.filter(x => x.on);
  return f.sort((a, b) => a.n - b.n);
}
</script>
<ul>{#each rows as r}<li>{r.n}</li>{/each}</ul>`);
  expect(out).toContain(`const rows = $derived.by(() => {`);
  expect(out).toContain(`const f = items.filter(x => x.on);`);
  expect(out).toContain(`return f.sort((a, b) => a.n - b.n);`);
  expect(out).not.toContain("derived rows");
});

test("single-line derived NAME = EXPR still → $derived(EXPR)", () => {
  const out = lower(`<script lang="ts">
derived doubled = count * 2;
</script>`);
  expect(out).toContain(`const doubled = $derived(count * 2);`);
  expect(out).not.toContain("$derived.by");
});

test("single-line derived = OBJECT LITERAL is not mis-captured as a block", () => {
  const out = lower(`<script lang="ts">
derived cfg = { a: 1, b: 2 };
</script>`);
  expect(out).toContain(`const cfg = $derived({ a: 1, b: 2 });`);
  expect(out).not.toContain("$derived.by");
});

test("brace-aware: nested braces inside the block body survive", () => {
  const out = lower(`<script lang="ts">
derived grouped {
  const m = new Map();
  for (const x of list) { m.set(x.k, { v: x.v }); }
  return m;
}
</script>`);
  expect(out).toContain(`const grouped = $derived.by(() => {`);
  expect(out).toContain(`for (const x of list) { m.set(x.k, { v: x.v }); }`);
  expect(out).toContain(`return m;\n})`);
});

test("derived block coexists with signal + single-line derived", () => {
  const out = lower(`<script lang="ts">
signal n = 0;
derived d1 = n + 1;
derived d2 {
  return n * n;
}
</script>`);
  expect(out).toContain(`let n = $state(0);`); // local signal inlined
  expect(out).toContain(`const d1 = $derived(n + 1);`);
  expect(out).toContain(`const d2 = $derived.by(() => {`);
});
