import { test, expect } from "bun:test";
import { lowerPuiReactivity } from "../src/index.ts";

test("mount { } lowers to onMount(() => { }) and injects the onMount import", () => {
  const src = `<script lang="ts">
mount {
  console.log("up");
}
</script>
<p>hi</p>`;
  const out = lowerPuiReactivity(src);
  expect(out).toContain(`import { onMount } from "@lyku/para-ui";`);
  expect(out).toContain(`onMount(() => {\n  console.log("up");\n})`);
  expect(out).not.toContain("mount {");
});

test("brace-aware: nested braces and a returned cleanup arrow survive", () => {
  const src = `<script lang="ts">
mount {
  const o = { a: 1, b: { c: 2 } };
  const id = setInterval(() => {}, o.a);
  return () => clearInterval(id);
}
</script>`;
  const out = lowerPuiReactivity(src);
  expect(out).toContain(
    `onMount(() => {\n  const o = { a: 1, b: { c: 2 } };\n` +
      `  const id = setInterval(() => {}, o.a);\n` +
      `  return () => clearInterval(id);\n})`,
  );
});

test("hand-authored onMount( ... ) is not re-matched (lead guard)", () => {
  const src = `<script lang="ts">
import { onMount } from "@lyku/para-ui";
onMount(() => { foo(); });
</script>`;
  const out = lowerPuiReactivity(src);
  // Untouched: still a single onMount call, no double-wrap.
  expect(out).toContain(`onMount(() => { foo(); });`);
  expect(out).not.toContain("onMount(() => {onMount");
});

test("no onMount import when no mount block is present", () => {
  const src = `<script lang="ts">
signal n = 0;
</script>`;
  const out = lowerPuiReactivity(src);
  expect(out).not.toContain("onMount");
});

test("mount coexists with effect, using and signal in one component", () => {
  const src = `<script lang="ts">
signal n = 0;
mount { n = 1; }
effect { console.log(n); }
using r = makeResource();
</script>`;
  const out = lowerPuiReactivity(src);
  expect(out).toContain(`import { onDestroy, onMount } from "@lyku/para-ui";`);
  expect(out).toContain(`onMount(() => { n = 1; })`);
  expect(out).toContain(`$effect(() => { console.log(n); })`);
  expect(out).toContain(`onDestroy(() => r.dispose?.());`);
});
