import { test, expect } from "bun:test";
import { lowerInlineSnippets } from "../src/index.ts";

test("bare markup attribute lifts to a zero-arg snippet", () => {
  const out = lowerInlineSnippets(`<Form header={<Header>Hi</Header>}>x</Form>`);
  expect(out).toMatch(/header=\{\(__para_attr_1\.__para_snippet = true, __para_attr_1\)\}/);
  expect(out).toMatch(/\{#snippet __para_attr_1\(\)\}<Header>Hi<\/Header>\{\/snippet\}/);
});

test("multi-line markup attribute lifts as a single snippet", () => {
  const out = lowerInlineSnippets(`<Form actions={
    <Wrap>
      <Inner/>
    </Wrap>
  }>x</Form>`);
  expect(out).toMatch(/actions=\{\s*\(__para_attr_1\.__para_snippet = true, __para_attr_1\)\s*\}/);
  expect(out).toMatch(/\{#snippet __para_attr_1\(\)\}\s*<Wrap>\s*<Inner\/>\s*<\/Wrap>\s*\{\/snippet\}/);
});

test("param form `(arg) => <JSX>` lifts to a parameterized snippet", () => {
  const out = lowerInlineSnippets(`<Table cell={(r) => <Tag>{r.x}</Tag>}/>`);
  expect(out).toContain("cell={(__para_attr_1.__para_snippet = true, __para_attr_1)}");
  expect(out).toMatch(/\{#snippet __para_attr_1\(r\)\}<Tag>\{r\.x\}<\/Tag>\{\/snippet\}/);
});

test("typed param form preserves TypeScript annotations on the snippet", () => {
  const out = lowerInlineSnippets(`<Table cell={(r: Row) => <Tag>{r.x}</Tag>}/>`);
  expect(out).toMatch(/\{#snippet __para_attr_1\(r: Row\)/);
});

test("JSX in object-literal expression position lifts in place (recursive)", () => {
  const out = lowerInlineSnippets(
    `<Tabs tabs={[{ id: 'a', content: <Box>A</Box> }, { id: 'b', content: <Box>B</Box> }]}/>`,
  );
  expect(out).toContain("content: (__para_attr_1.__para_snippet = true, __para_attr_1)");
  expect(out).toContain("content: (__para_attr_2.__para_snippet = true, __para_attr_2)");
  expect(out).toContain("{#snippet __para_attr_1()}<Box>A</Box>{/snippet}");
  expect(out).toContain("{#snippet __para_attr_2()}<Box>B</Box>{/snippet}");
});

test("JSX inside an {#each} hoists INSIDE the each body, not to module top", () => {
  const out = lowerInlineSnippets(`{#each items as item (item.id)}
    <Row label={<Tag>{item.name}</Tag>}/>
  {/each}`);
  const eachOpen = out.indexOf("{#each");
  const eachClose = out.indexOf("{/each}");
  const snipDecl = out.indexOf("{#snippet __para_attr_1");
  // The snippet declaration must land BETWEEN the open and close of the
  // each block so its closure over `item` resolves at render time.
  expect(snipDecl).toBeGreaterThan(eachOpen);
  expect(snipDecl).toBeLessThan(eachClose);
});

test("HTML comments containing attribute-shaped strings pass through verbatim", () => {
  const out = lowerInlineSnippets(`<!-- header={<Tag>doc</Tag>} should stay a comment -->\n<Form/>`);
  expect(out).not.toContain("__para_attr_1");
  expect(out.startsWith("<!-- header={<Tag>doc</Tag>} should stay a comment -->")).toBe(true);
});

test("JS comparison `{x < 5}` is left alone (no leading letter)", () => {
  const out = lowerInlineSnippets(`<X attr={count < 5 ? 'low' : 'high'}/>`);
  expect(out).not.toContain("__para_attr_1");
});

test("template-literal `${…}` in attribute body doesn't desync the scanner", () => {
  const out = lowerInlineSnippets(`<X attr={\`pre-\${count} (\${items.length})\`}/>`);
  expect(out).not.toContain("__para_attr_1");
  expect(out).toContain("`pre-${count}");
});

test("<script>/<style> blocks are passed through verbatim", () => {
  const out = lowerInlineSnippets(`<script>let x = (a, b) => <Junk/>;</script>\n<Y/>`);
  expect(out.startsWith("<script>let x = (a, b) => <Junk/>;</script>")).toBe(true);
  expect(out).not.toContain("__para_attr_1");
});

test("the snippet-tag side effect runs BEFORE the consumer receives it", () => {
  // The tag (`__para_attr_N.__para_snippet = true`) is folded into the
  // reference expression via the comma operator, NOT emitted as a
  // separate `{(…, '')}` template effect. This is load-bearing: a
  // post-mount effect would tag too late, since the consumer
  // (e.g. <Table>) receives the prop at mount time.
  const out = lowerInlineSnippets(`<Form header={<Header>Hi</Header>}/>`);
  expect(out).toContain("(__para_attr_1.__para_snippet = true, __para_attr_1)");
  // No separate side-effect block: the reference IS the tag.
  expect(out).not.toMatch(/\{\(__para_attr_1\.__para_snippet = true, ['"]['"]\)\}/);
});
