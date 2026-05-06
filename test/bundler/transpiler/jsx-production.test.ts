import { describe, expect, test } from "bun:test";
import { bunEnv, bunExe } from "harness";
import path from "path";

// https://github.com/oven-sh/bun/issues/3768
//
// 32 parallel subprocess spawns @ ~3s each on ASAN-instrumented debug
// builds blow past the default 5s test timeout under concurrency
// pressure. Bumping the per-test timeout to 30s gives enough headroom
// without giving up the parallelism. Production CI runs hit the happy
// path well under 5s anyway.
const TIMEOUT = 30_000;

describe.concurrent("jsx", () => {
  for (const node_env of ["production", "development", "test", ""]) {
    for (const child_node_env of ["production", "development", "test", ""]) {
      test(
        `react-jsxDEV parent: ${node_env} child: ${child_node_env} should work`,
        async () => {
          const env = { ...bunEnv };
          env.NODE_ENV = node_env;
          env.CHILD_NODE_ENV = child_node_env;
          env.TSCONFIG_JSX = "react-jsxdev";
          await using proc = Bun.spawn({
            cmd: [bunExe(), "run", path.join(import.meta.dirname, "jsx-dev", "jsx-dev.tsx")],
            cwd: import.meta.dirname,
            env: env,
            stdout: "pipe",
            stderr: "inherit",
            stdin: "ignore",
          });
          const out = await new Response(proc.stdout).text();
          expect(out).toBe("<div>Hello World</div>" + "\n" + "<div>Hello World</div>" + "\n");
          expect(await proc.exited).toBe(0);
        },
        TIMEOUT,
      );

      test(
        `react-jsx parent: ${node_env} child: ${child_node_env} should work`,
        async () => {
          const env = { ...bunEnv };
          env.NODE_ENV = node_env;
          env.CHILD_NODE_ENV = child_node_env;
          env.TSCONFIG_JSX = "react-jsx";
          await using proc = Bun.spawn({
            cmd: [bunExe(), "run", path.join(import.meta.dirname, "jsx-production-entry.ts")],
            cwd: import.meta.dirname,
            env: env,
            stdout: "pipe",
            stderr: "inherit",
            stdin: "ignore",
          });
          const out = await new Response(proc.stdout).text();
          expect(out).toBe("<div>Hello World</div>" + "\n" + "<div>Hello World</div>" + "\n");
          expect(await proc.exited).toBe(0);
        },
        TIMEOUT,
      );
    }
  }
});
