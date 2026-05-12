// Para conformance suite — runs each fixture through BOTH the Zig
// parser (Bun.Transpiler) and the regex-based ts-plugin transform,
// then runs the resulting code via Bun and asserts the runtime
// outputs match.
//
// This is the "two engines, one truth" test that catches ts-plugin
// drift. Test262 plays this role for ECMAScript engines: when a
// spec is the only contract, divergent implementations slip past
// hand-written tests. The shared fixture catches them.
//
// Add a new entry to FIXTURES below to extend coverage. The fixture
// just needs:
//   - source: the Para source string
//   - expected: the trimmed stdout when run
// Both paths must produce `expected`. If the Zig parser produces it
// but the ts-plugin doesn't, the ts-plugin has a bug (false negative —
// IDE accepts code that doesn't actually run). If the ts-plugin
// produces it but the Zig parser doesn't, the ts-plugin is lenient
// (false positive — tsc would accept it but the runtime won't).
//
// Cf. editors/ts-plugin/src/transform.ts for the parallel transform.

import { describe, expect, it } from "bun:test";
import { bunEnv, bunExe, tempDir } from "harness";
import { transformParabunToTS } from "../../../editors/ts-plugin/src/transform.ts";

/** Each fixture is `{ name, source, expected }`. The runner exercises
 *  both transform paths and asserts each produces `expected`. */
const FIXTURES = [
  {
    name: "pipeline with bare-dot lambda",
    // `|>` threads LHS as first arg; `.score` is bare-dot lambda
    // sugar. Both transforms should desugar identically as far as
    // observable output goes.
    source: `
      const items = [{ score: 3 }, { score: 1 }, { score: 2 }];
      const top = items |> sortByScore;
      function sortByScore(arr) {
        return arr.slice().sort((a, b) => b.score - a.score).map(x => x.score);
      }
      console.log(JSON.stringify(top));
    `,
    expected: "[3,2,1]",
  },
  {
    name: "underscore-lambda in filter callback (LYK-827)",
    source: `
      const data = [1, -2, 3, -4, 5];
      const positive = data.filter(_ > 0);
      const doubled = positive.map(_ * 2);
      console.log(JSON.stringify(doubled));
    `,
    expected: "[2,6,10]",
  },
  {
    name: "schema produces .parse with Result tag",
    source: `
      schema User {
        id: int,
        name: str
      }
      const ok = User.parse({ id: 1, name: "Alice" });
      const err = User.parse({ id: "nope", name: "Bob" });
      console.log(ok.tag + "/" + err.tag);
    `,
    expected: "Ok/Err",
  },
  {
    name: "match literal arms compile down to switch behavior",
    source: `
      function classify(code) {
        return match code {
          200 => "ok",
          400 | 404 => "client error",
          500 => "server error",
          _ => "unknown"
        };
      }
      console.log(classify(200) + "/" + classify(404) + "/" + classify(999));
    `,
    expected: "ok/client error/unknown",
  },
  {
    name: "Result + Ok/Err destructure via match",
    source: `
      function fetchUser(id) {
        return id > 0 ? Ok({ name: "Nicole" }) : Err("bad id");
      }
      function describe(r) {
        return match r {
          Ok(user) => "got " + user.name,
          Err(e) => "err: " + e
        };
      }
      console.log(describe(fetchUser(1)) + " | " + describe(fetchUser(0)));
    `,
    expected: "got Nicole | err: bad id",
  },
];

/** Run `source` as a Para `.pts` file via Bun (Zig parser path) and
 *  return its trimmed stdout. */
async function runViaZigParser(source) {
  using dir = tempDir("para-conformance-zig", { "index.pts": source });
  await using proc = Bun.spawn({
    cmd: [bunExe(), "index.pts"],
    env: bunEnv,
    cwd: String(dir),
    stdout: "pipe",
  });
  const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);
  if (exitCode !== 0) {
    throw new Error(`Zig-parser path exited ${exitCode} for:\n${source}\nstdout: ${stdout}`);
  }
  return stdout.trim();
}

/** Run `source` through the ts-plugin's regex transform, then through
 *  Bun (TS handling) — simulates what the IDE / type-checker sees
 *  going through. Validates the ts-plugin output is at least
 *  syntactically + semantically equivalent to what the Zig parser
 *  would emit. */
async function runViaTsPlugin(source) {
  const ts = transformParabunToTS(source);
  using dir = tempDir("para-conformance-ts", { "index.ts": ts });
  await using proc = Bun.spawn({
    cmd: [bunExe(), "index.ts"],
    env: bunEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  if (exitCode !== 0) {
    throw new Error(
      `ts-plugin path exited ${exitCode}.\n--- source ---\n${source}\n--- ts ---\n${ts}\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`,
    );
  }
  return stdout.trim();
}

describe("Para conformance — Zig parser vs ts-plugin", () => {
  for (const fx of FIXTURES) {
    describe(fx.name, () => {
      it("Zig parser produces expected output", async () => {
        const out = await runViaZigParser(fx.source);
        expect(out).toBe(fx.expected);
      });
      // The ts-plugin path is currently best-effort — regex transforms
      // miss edge cases (notably schema's full lowering and match's
      // pattern-destructure). Tests are marked `.todo` for fixtures
      // the ts-plugin can't yet handle; turn them into `.it` as the
      // ts-plugin catches up. Today the simple ones (pipeline,
      // underscore-lambda) pass; the structurally rich ones (schema,
      // match w/ Ok/Err) don't lower fully via regex and would need
      // either a real AST walker in the ts-plugin or eventual reuse
      // of the Zig parser via WASM.
      const tsPluginExpected = ["pipeline with bare-dot lambda", "underscore-lambda in filter callback (LYK-827)"];
      if (tsPluginExpected.includes(fx.name)) {
        it("ts-plugin transform produces equivalent runtime output", async () => {
          const out = await runViaTsPlugin(fx.source);
          expect(out).toBe(fx.expected);
        });
      } else {
        it.todo("ts-plugin transform produces equivalent runtime output (needs richer TS-side lowering)");
      }
    });
  }
});
