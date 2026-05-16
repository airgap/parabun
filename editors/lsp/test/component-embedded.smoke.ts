#!/usr/bin/env parabun
// Smoke test: parabun-lsp serves diagnostics on Svelte-shaped component files.
// Covers both `.svelte` (legacy preprocessor flow — only `lang="pts"` etc.
// engages) and `.pui` (Para's native UI format — file extension is the
// marker; bare `<script>` and `<script lang="ts">` engage too). Verifies
// type-error diagnostics, clean-script silence, and well-formedness
// (unclosed `<script>` tag).

import { spawn } from "node:child_process";
import * as path from "node:path";

const LSP = path.resolve(__dirname, "..", "parabun-lsp.ts");

interface Case {
  uri: string;
  text: string;
  expect: "diag-on-line" | "no-diag";
  expectLine?: number;
}

const cases: Case[] = [
  {
    uri: "file:///tmp/SmokeA.svelte",
    text: `<!-- header -->
<script lang="pts">
  const n: number = "not a number";
</script>

<p>hello</p>
`,
    expect: "diag-on-line",
    expectLine: 2,
  },
  {
    uri: "file:///tmp/SmokeB.svelte",
    text: `<script lang="pts">
  export const b: number = 42;
</script>

<p>{b}</p>
`,
    expect: "no-diag",
  },
  {
    uri: "file:///tmp/SmokeC.svelte",
    text: `<script lang="ts">
  export const c: number = "not a number";
</script>

<p>plain svelte file</p>
`,
    expect: "no-diag",
  },
  // .pui: parabun-flavored by file extension. Bare <script> and
  // <script lang="ts"> both engage. Diagnostics fire just like .svelte +
  // lang="pts".
  {
    uri: "file:///tmp/SmokeD.pui",
    text: `<script lang="pts">
  export const d: number = "still wrong";
</script>

<p>pui with explicit lang</p>
`,
    expect: "diag-on-line",
    expectLine: 1,
  },
  {
    uri: "file:///tmp/SmokeE.pui",
    text: `<script lang="ts">
  export const e: number = "ts inside pui should still type-check";
</script>

<p>pui with lang=ts</p>
`,
    expect: "diag-on-line",
    expectLine: 1,
  },
  {
    uri: "file:///tmp/SmokeF.pui",
    text: `<script>
  export const f: number = "bare script in pui is parabun";
</script>

<p>pui with bare script</p>
`,
    expect: "diag-on-line",
    expectLine: 1,
  },
  // Well-formedness: unclosed parabun-flavored <script> tag emits a fast-pass
  // diagnostic on the opening tag line. In .pui the bare <script> counts;
  // in .svelte only lang="pts"/"parabun"/"pjs" counts.
  {
    uri: "file:///tmp/SmokeG.pui",
    text: `<script>
  const g: number = 5;

<p>oops, no closing script tag</p>
`,
    expect: "diag-on-line",
    expectLine: 0,
  },
  {
    uri: "file:///tmp/SmokeH.svelte",
    text: `<script lang="pts">
  const h: number = 5;

<p>oops, no closing script tag</p>
`,
    expect: "diag-on-line",
    expectLine: 0,
  },
  // Para `.pui` reactivity keywords must NOT trip the fast-pass parabun
  // parser. mount/prop/single-line-derived were missing from
  // transformParabunToTS + PARABUN_SYNTAX_RE and produced a spurious
  // `Expected ";" but found "{"` (source "parabun") on valid .pui.
  {
    uri: "file:///tmp/SmokeI.pui",
    text: `<script lang="ts">
  prop title: string = '', count = 0;
  derived shout = title;
  mount {
    console.log(shout, count);
  }
</script>

<p>{shout}</p>
`,
    expect: "no-diag",
  },
  {
    uri: "file:///tmp/SmokeJ.pui",
    text: `<script lang="ts">
  mount{}
</script>

<p>empty mount, no spaces</p>
`,
    expect: "no-diag",
  },
];

const proc = spawn("parabun", ["run", LSP, "--stdio"], {
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env, BUN_DEBUG_QUIET_LOGS: "1" },
});

let buf = "";
const allPublishes: { uri: string; diagnostics: any[] }[] = [];

function send(msg: object): void {
  const json = JSON.stringify(msg);
  const header = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`;
  proc.stdin.write(header + json);
}

proc.stdout.setEncoding("utf8");
proc.stdout.on("data", (chunk: string) => {
  buf += chunk;
  while (true) {
    const headerEnd = buf.indexOf("\r\n\r\n");
    if (headerEnd === -1) break;
    const header = buf.slice(0, headerEnd);
    const lenMatch = header.match(/Content-Length:\s*(\d+)/i);
    if (!lenMatch) {
      buf = buf.slice(headerEnd + 4);
      continue;
    }
    const len = Number(lenMatch[1]);
    const bodyStart = headerEnd + 4;
    if (buf.length < bodyStart + len) break;
    const body = buf.slice(bodyStart, bodyStart + len);
    buf = buf.slice(bodyStart + len);
    let msg: any;
    try {
      msg = JSON.parse(body);
    } catch {
      continue;
    }
    if (msg.method === "textDocument/publishDiagnostics") allPublishes.push(msg.params);
  }
});

proc.stderr.on("data", (chunk: Buffer) => {
  const s = chunk.toString();
  if (s.trim()) console.error("[lsp stderr]", s.trim());
});

async function run(): Promise<void> {
  send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { processId: process.pid, rootUri: "file:///raid/parabun", capabilities: {} },
  });
  send({ jsonrpc: "2.0", method: "initialized", params: {} });

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i]!;
    send({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri: c.uri,
          languageId: c.uri.endsWith(".pui") ? "parabun-ui" : "svelte",
          version: 1,
          text: c.text,
        },
      },
    });
  }

  // Wait long enough for the slow tsc pass on all three docs.
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (cases.every(c => allPublishes.some(p => p.uri === c.uri))) {
      // Wait a bit more in case slow pass replaces fast pass.
      await new Promise(r => setTimeout(r, 1500));
      break;
    }
    await new Promise(r => setTimeout(r, 250));
  }

  let failed = 0;
  for (const c of cases) {
    // Use the LAST publish for this URI (slow pass clobbers fast pass).
    const latest = [...allPublishes].reverse().find(p => p.uri === c.uri);
    const diags = latest?.diagnostics ?? [];
    if (c.expect === "no-diag") {
      if (diags.length !== 0) {
        console.error(`FAIL ${c.uri}: expected no diagnostics, got ${diags.length}:`, diags);
        failed++;
      } else {
        console.log(`PASS ${c.uri}: no diagnostics`);
      }
    } else {
      const onLine = diags.some(d => d.range?.start?.line === c.expectLine);
      if (!onLine) {
        console.error(`FAIL ${c.uri}: expected diagnostic on line ${c.expectLine}, got ${JSON.stringify(diags)}`);
        failed++;
      } else {
        console.log(`PASS ${c.uri}: diagnostic on line ${c.expectLine}`);
      }
    }
  }

  proc.kill();
  process.exit(failed === 0 ? 0 : 1);
}

run();
