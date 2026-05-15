import { test, expect } from "bun:test";
import { lowerPuiReactivity } from "../src/index.ts";

const lower = (s: string, hmr = false) => lowerPuiReactivity(s, "@lyku/para-ui", false, hmr);

test("provably-local signal → $state-only, no para bridge, no import", () => {
  const out = lower(`<script lang="ts">
signal count = 0;
count = count + 1;
</script>
<button onclick={() => count++}>{count}</button>`);
  expect(out).toContain(`let count = $state(0);`);
  expect(out).not.toContain("__sig_count");
  expect(out).not.toContain("@lyku/para-signals");
  // plain assignment stays native $state (not rewritten to .set())
  expect(out).toContain(`count = count + 1;`);
});

test("signal observed via signalOf → keeps the bridge form + import", () => {
  const out = lower(`<script lang="ts">
signal shared = 0;
const s = signalOf(shared);
</script>`);
  expect(out).toContain(`import { signal } from "@lyku/para-signals";`);
  expect(out).toContain(`const __sig_shared = signal(0);`);
  expect(out).toContain(`$state(__sig_shared.peek())`);
});

test("signalOf anywhere is a coarse file-level gate (all signals bridged)", () => {
  const out = lower(`<script lang="ts">
signal a = 1;
signal b = 2;
const x = signalOf(a);
</script>`);
  // `b` doesn't escape itself, but signalOf-in-file keeps the whole file
  // on today's behavior (zero-regression conservatism).
  expect(out).toContain(`const __sig_a = signal(1);`);
  expect(out).toContain(`const __sig_b = signal(2);`);
});

test("signal flowing into provide/context → keeps the bridge", () => {
  const out = lower(`<script lang="ts">
signal theme = "dark";
provide theme = theme;
</script>`);
  expect(out).toContain(`const __sig_theme = signal("dark");`);
  expect(out).not.toContain(`let theme = $state("dark");`);
});

test("exported signal → keeps the bridge", () => {
  const out = lower(`<script lang="ts">
signal n = 0;
export { n };
</script>`);
  expect(out).toContain(`const __sig_n = signal(0);`);
});

test("mixed: local inlined, escaping bridged, in one component", () => {
  const out = lower(`<script lang="ts">
signal local = 0;
signal exposed = 1;
const h = signalOf(exposed);
</script>`);
  // signalOf present → coarse gate bridges both (documented v1 behavior).
  expect(out).toContain(`const __sig_local = signal(0);`);
  expect(out).toContain(`const __sig_exposed = signal(1);`);
});

test("local signal still HMR-irrelevant: hmr=true doesn't bridge a local cell", () => {
  const out = lower(
    `<script lang="ts">
signal count = 0;
</script>`,
    true,
  );
  // No para signal → nothing for the HMR registry to preserve; plain $state.
  expect(out).toContain(`let count = $state(0);`);
  expect(out).not.toContain("hmrSignal");
  expect(out).not.toContain("__sig_count");
});

test("escaping signal under hmr=true still gets the registry bridge", () => {
  const out = lower(
    `<script lang="ts">
signal shared = 0;
const s = signalOf(shared);
</script>`,
    true,
  );
  expect(out).toContain(`import { signal, hmrSignal } from "@lyku/para-signals";`);
  expect(out).toContain(`hmrSignal(import.meta.url + "::shared", () => signal(0))`);
});
