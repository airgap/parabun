import { expect, test } from "bun:test";
import { bunEnv, bunExe, tempDirWithFiles } from "harness";
import { join } from "path";
import { chmodSync, unlinkSync } from "fs";

function latestRegistry() {
  const requests: string[] = [];
  const integrity = `sha512-${Buffer.alloc(64).toString("base64")}`;
  const registry = Bun.serve({
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      requests.push(path);
      if (path !== "/floating") return new Response("Unexpected registry request", { status: 404 });
      return Response.json({
        name: "floating",
        "dist-tags": { latest: "2.0.0" },
        versions: Object.fromEntries(
          ["1.0.0", "2.0.0"].map(version => [
            version,
            {
              name: "floating",
              version,
              dist: { tarball: `${registry.url}floating/-/floating-${version}.tgz`, integrity },
            },
          ]),
        ),
      });
    },
  });
  return { registry, requests, integrity };
}

for (const scenario of [
  "workspace",
  "root",
  "workspace-external-peer",
  "root-external-peer",
  "prepare-only",
  "dependency-edit",
] as const) {
  test(`frozen text lockfile retains locked versions except for genuine dependency edits: ${scenario}`, async () => {
    const { registry, requests, integrity } = latestRegistry();
    try {
      const duplicateAtRoot = scenario === "root" || scenario === "root-external-peer";
      const externalPeer = scenario === "workspace-external-peer" || scenario === "root-external-peer";
      const edited = scenario === "dependency-edit";
      const declarations = {
        devDependencies: { b: "workspace:*", floating: "latest" },
        ...(["workspace", "root"].includes(scenario) || externalPeer
          ? { peerDependencies: { b: externalPeer ? "^2.0.0" : "workspace:*" } }
          : {}),
      };
      const currentDeclarations = {
        ...declarations,
        devDependencies: { ...declarations.devDependencies, floating: edited ? "^2.0.0" : "latest" },
      };
      const root = { name: "root", workspaces: ["packages/*"], ...(duplicateAtRoot ? currentDeclarations : {}) };
      const workspace = {
        name: "a",
        version: "1.0.0",
        ...(!duplicateAtRoot ? currentDeclarations : {}),
        ...(scenario === "prepare-only" ? { scripts: { prepare: "echo local-prepare" } } : {}),
      };
      const initialLock = JSON.stringify({
        lockfileVersion: 2,
        configVersion: 1,
        workspaces: {
          "": { name: "root", ...(duplicateAtRoot ? declarations : {}) },
          "packages/a": { name: "a", version: "1.0.0", ...(!duplicateAtRoot ? declarations : {}) },
          "packages/b": { name: "b", version: "1.0.0" },
        },
        packages: {
          a: ["a@workspace:packages/a"],
          b: ["b@workspace:packages/b"],
          floating: ["floating@1.0.0", "", {}, integrity],
        },
      });
      const dir = tempDirWithFiles("frozen-workspace-dev-peer", {
        "package.json": JSON.stringify(root),
        "packages/a/package.json": JSON.stringify(workspace),
        "packages/b/package.json": JSON.stringify({ name: "b", version: "1.0.0" }),
        "bun.lock": initialLock,
      });
      const proc = Bun.spawn({
        cmd: [
          bunExe(),
          "install",
          "--frozen-lockfile",
          "--lockfile-only",
          "--ignore-scripts",
          `--registry=${registry.url}`,
        ],
        cwd: dir,
        env: { ...bunEnv, BUN_INSTALL_CACHE_DIR: join(dir, ".cache") },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      if (edited) {
        expect(stderr).toContain("lockfile had changes, but lockfile is frozen");
        expect(exitCode).toBe(1);
        expect(await Bun.file(join(dir, "bun.lock")).text()).toBe(initialLock);
      } else {
        expect(stdout, stderr).toContain("Saved bun.lock");
        expect(requests).toEqual([]);
        expect(exitCode).toBe(0);
        const lock = Bun.JSONC.parse(await Bun.file(join(dir, "bun.lock")).text());
        expect(lock.packages.floating[0]).toBe("floating@1.0.0");
      }
    } finally {
      registry.stop(true);
    }
  });
}

test("frozen text lockfile refreshes workspace prepare scripts without bypassing ignore-scripts", async () => {
  const { registry, requests } = latestRegistry();
  try {
    const dir = tempDirWithFiles("frozen-workspace-prepare", {
      "package.json": JSON.stringify({ name: "root", workspaces: ["packages/*"], trustedDependencies: ["a"] }),
      "packages/a/package.json": JSON.stringify({
        name: "a",
        version: "1.0.0",
        devDependencies: { b: "workspace:*" },
        scripts: { prepare: `${JSON.stringify(bunExe())} prepare.js` },
      }),
      "packages/a/prepare.js": 'require("fs").appendFileSync("prepared.txt", "prepared");',
      "packages/b/package.json": JSON.stringify({ name: "b", version: "1.0.0" }),
    });
    async function install(...flags: string[]) {
      const proc = Bun.spawn({
        cmd: [bunExe(), "install", `--registry=${registry.url}`, ...flags],
        cwd: dir,
        env: { ...bunEnv, BUN_INSTALL_CACHE_DIR: join(dir, ".cache") },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      expect(stdout, stderr).toContain("bun install");
      expect(exitCode).toBe(0);
    }
    const marker = join(dir, "packages/a/prepared.txt");
    await install("--ignore-scripts");
    expect(await Bun.file(marker).exists()).toBe(false);
    await install("--frozen-lockfile");
    expect(await Bun.file(marker).text()).toBe("prepared");
    unlinkSync(marker);
    await install("--frozen-lockfile", "--ignore-scripts");
    expect(await Bun.file(marker).exists()).toBe(false);
    expect(requests).toEqual([]);
  } finally {
    registry.stop(true);
  }
});

test("frozen text lockfile refreshes workspace bins when prepare scripts change", async () => {
  const { registry, requests } = latestRegistry();
  try {
    const workspace = {
      name: "a",
      version: "1.0.0",
      devDependencies: { b: "workspace:*" },
      bin: { "test-cli": "old-cli.js", "aux-cli": "old-cli.js" },
      scripts: { prepare: `${JSON.stringify(bunExe())} prepare.js first` },
    };
    const dir = tempDirWithFiles("frozen-workspace-bin", {
      "package.json": JSON.stringify({
        name: "root",
        workspaces: ["packages/*"],
        dependencies: { a: "workspace:*" },
        trustedDependencies: ["a"],
      }),
      "packages/a/package.json": JSON.stringify(workspace),
      "packages/a/prepare.js": 'require("fs").writeFileSync("prepared.txt", process.argv[2]);',
      "packages/a/old-cli.js": '#!/usr/bin/env bun\nconsole.log("old");',
      "packages/a/new-cli.js": '#!/usr/bin/env bun\nconsole.log("new");',
      "packages/b/package.json": JSON.stringify({ name: "b", version: "1.0.0" }),
    });
    chmodSync(join(dir, "packages/a/old-cli.js"), 0o755);
    chmodSync(join(dir, "packages/a/new-cli.js"), 0o755);
    async function command(...args: string[]) {
      const proc = Bun.spawn({
        cmd: [bunExe(), ...args],
        cwd: dir,
        env: { ...bunEnv, BUN_INSTALL_CACHE_DIR: join(dir, ".cache") },
        stdout: "pipe",
        stderr: "pipe",
      });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      return { stdout, stderr, exitCode };
    }
    const seed = await command("install", "--ignore-scripts", `--registry=${registry.url}`);
    expect(seed.stdout, seed.stderr).toContain("bun install");
    expect(seed.exitCode).toBe(0);
    const original = await command("run", "--bun", "test-cli");
    expect(original.stdout.trim(), original.stderr).toBe("old");
    expect(original.exitCode).toBe(0);
    workspace.bin["test-cli"] = "new-cli.js";
    workspace.scripts.prepare = `${JSON.stringify(bunExe())} prepare.js second`;
    await Bun.write(join(dir, "packages/a/package.json"), JSON.stringify(workspace));
    const changed = await command("install", "--frozen-lockfile", `--registry=${registry.url}`);
    expect(changed.stdout, changed.stderr).toContain("bun install");
    expect(changed.exitCode).toBe(0);
    expect(await Bun.file(join(dir, "packages/a/prepared.txt")).text()).toBe("second");
    const updated = await command("run", "--bun", "test-cli");
    expect(updated.stdout.trim(), updated.stderr).toBe("new");
    expect(updated.exitCode).toBe(0);
    const unchanged = await command("run", "--bun", "aux-cli");
    expect(unchanged.stdout.trim(), unchanged.stderr).toBe("old");
    expect(unchanged.exitCode).toBe(0);
    expect(requests).toEqual([]);
  } finally {
    registry.stop(true);
  }
});

test("workspace devDependencies should take priority over peerDependencies for resolution", async () => {
  const dir = tempDirWithFiles("dev-peer-priority", {
    "package.json": JSON.stringify({
      name: "test-monorepo",
      version: "1.0.0",
      workspaces: {
        packages: ["packages/*"],
        nodeLinker: "isolated",
      },
    }),
    "packages/lib/package.json": JSON.stringify({
      name: "lib",
      version: "1.0.0",
      dependencies: {},
      devDependencies: {
        "jquery": "workspace:*", // Use workspace protocol for dev
      },
      peerDependencies: {
        "jquery": "3.7.0", // Range wants 3.7.0
      },
    }),
    "packages/lib/test.js": `const dep = require("jquery"); console.log(dep.version);`,
    // Only provide workspace package with version 2.0.0
    "packages/my-dep/package.json": JSON.stringify({
      name: "jquery",
      version: "2.0.0",
      main: "index.js",
    }),
    "packages/my-dep/index.js": `module.exports = { version: "2.0.0" };`,
  });

  // Run initial install
  let { stdout, stderr, exitCode } = await new Promise<{ stdout: string; stderr: string; exitCode: number }>(
    resolve => {
      const proc = Bun.spawn({
        cmd: [bunExe(), "install", "--no-progress", "--no-summary"],
        cwd: dir,
        env: bunEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      proc.exited.then(exitCode => {
        Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]).then(([stdout, stderr]) => {
          resolve({ stdout, stderr, exitCode });
        });
      });
    },
  );

  if (exitCode !== 0) {
    console.error("Install failed with exit code:", exitCode);
    console.error("stdout:", stdout);
    console.error("stderr:", stderr);
  }
  expect(exitCode).toBe(0);

  // Now run bun install with a dead registry to ensure no network requests
  ({ stdout, stderr, exitCode } = await new Promise<{ stdout: string; stderr: string; exitCode: number }>(resolve => {
    const proc = Bun.spawn({
      cmd: [bunExe(), "install", "--no-progress", "--no-summary"],
      cwd: dir,
      env: {
        ...bunEnv,
        NPM_CONFIG_REGISTRY: "http://localhost:9999/", // Dead URL - will fail if used
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    proc.exited.then(exitCode => {
      Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]).then(([stdout, stderr]) => {
        resolve({ stdout, stderr, exitCode });
      });
    });
  }));

  if (exitCode !== 0) {
    console.error("Install failed with exit code:", exitCode);
    console.error("stdout:", stdout);
    console.error("stderr:", stderr);
  }
  expect(exitCode).toBe(0);

  // Check that no network requests were made for packages that should be resolved locally
  expect(stderr).not.toContain("GET");
  expect(stderr).not.toContain("http");

  // Check that the lockfile was created correctly
  const lockfilePath = join(dir, "bun.lock");
  expect(await Bun.file(lockfilePath).exists()).toBe(true);

  // Verify that version 2.0.0 (devDependency) was linked
  // If peerDependency range ^1.0.0 was used, it would try to fetch from npm and fail
  const testResult = await new Promise<string>(resolve => {
    const proc = Bun.spawn({
      cmd: [bunExe(), "packages/lib/test.js"],
      cwd: dir,
      env: bunEnv,
      stdout: "pipe",
    });

    new Response(proc.stdout).text().then(resolve);
  });

  expect(testResult.trim()).toBe("2.0.0");
});

test("devDependencies and peerDependencies with different versions should coexist", async () => {
  const dir = tempDirWithFiles("dev-peer-different-versions", {
    "package.json": JSON.stringify({
      name: "test-monorepo",
      version: "1.0.0",
      workspaces: {
        packages: ["packages/*"],
        nodeLinker: "isolated",
      },
    }),
    "packages/lib/package.json": JSON.stringify({
      name: "lib",
      version: "1.0.0",
      dependencies: {},
      devDependencies: {
        "utils": "1.0.0",
      },
      peerDependencies: {
        "utils": "^1.0.0",
      },
    }),
    "packages/lib/index.js": `console.log("lib");`,
    "packages/utils/package.json": JSON.stringify({
      name: "utils",
      version: "1.0.0",
      main: "index.js",
    }),
    "packages/utils/index.js": `console.log("utils");`,
  });

  // Run bun install in the monorepo
  const { stdout, stderr, exitCode } = await new Promise<{ stdout: string; stderr: string; exitCode: number }>(
    resolve => {
      const proc = Bun.spawn({
        cmd: [bunExe(), "install", "--no-progress", "--no-summary"],
        cwd: dir,
        env: bunEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      proc.exited.then(exitCode => {
        Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]).then(([stdout, stderr]) => {
          resolve({ stdout, stderr, exitCode });
        });
      });
    },
  );

  if (exitCode !== 0) {
    console.error("Install failed with exit code:", exitCode);
    console.error("stdout:", stdout);
    console.error("stderr:", stderr);
  }
  expect(exitCode).toBe(0);

  // Check that the lockfile was created correctly
  const lockfilePath = join(dir, "bun.lock");
  expect(await Bun.file(lockfilePath).exists()).toBe(true);
});

test("dependency behavior comparison prioritizes devDependencies", async () => {
  const dir = tempDirWithFiles("behavior-comparison", {
    "package.json": JSON.stringify({
      name: "test-app",
      version: "1.0.0",
      dependencies: {},
      devDependencies: {
        "typescript": "^5.0.0",
      },
      peerDependencies: {
        "typescript": "^4.0.0 || ^5.0.0",
      },
    }),
    "index.js": `console.log("app");`,
  });

  // Run bun install
  const { stdout, stderr, exitCode } = await new Promise<{ stdout: string; stderr: string; exitCode: number }>(
    resolve => {
      const proc = Bun.spawn({
        cmd: [bunExe(), "install", "--no-progress", "--no-summary"],
        cwd: dir,
        env: bunEnv,
        stdout: "pipe",
        stderr: "pipe",
      });

      proc.exited.then(exitCode => {
        Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]).then(([stdout, stderr]) => {
          resolve({ stdout, stderr, exitCode });
        });
      });
    },
  );

  if (exitCode !== 0) {
    console.error("Install failed with exit code:", exitCode);
    console.error("stdout:", stdout);
    console.error("stderr:", stderr);
  }
  expect(exitCode).toBe(0);

  // Check that the lockfile was created correctly
  const lockfilePath = join(dir, "bun.lock");
  expect(await Bun.file(lockfilePath).exists()).toBe(true);
});

test("Next.js monorepo scenario should not make unnecessary network requests", async () => {
  const dir = tempDirWithFiles("nextjs-monorepo", {
    "package.json": JSON.stringify({
      name: "nextjs-monorepo",
      version: "1.0.0",
      workspaces: {
        packages: ["packages/*"],
        nodeLinker: "isolated",
      },
    }),
    "packages/web/package.json": JSON.stringify({
      name: "web",
      version: "1.0.0",
      dependencies: {},
      devDependencies: {
        "next": "15.0.0-canary.119", // Specific canary version for dev
      },
      peerDependencies: {
        "next": "^14.0.0 || ^15.0.0", // Range that would accept 14.x or 15.x stable
      },
    }),
    "packages/web/test.js": `const next = require("next/package.json"); console.log(next.version);`,
    // Only provide the canary version that matches devDependencies
    "packages/next/package.json": JSON.stringify({
      name: "next",
      version: "15.0.0-canary.119",
      main: "index.js",
    }),
    "packages/next/index.js": `console.log("next workspace");`,
  });

  // Run initial install
  let { stdout, stderr, exitCode } = await new Promise<{ stdout: string; stderr: string; exitCode: number }>(
    resolve => {
      const proc = Bun.spawn({
        cmd: [bunExe(), "install", "--no-progress", "--no-summary"],
        cwd: dir,
        env: bunEnv,
        stdout: "pipe",
        stderr: "pipe",
      });
      proc.exited.then(exitCode => {
        Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]).then(([stdout, stderr]) => {
          resolve({ stdout, stderr, exitCode });
        });
      });
    },
  );

  if (exitCode !== 0) {
    console.error("Install failed with exit code:", exitCode);
    console.error("stdout:", stdout);
    console.error("stderr:", stderr);
  }
  expect(exitCode).toBe(0);

  // Run bun install with dead registry
  ({ stdout, stderr, exitCode } = await new Promise<{ stdout: string; stderr: string; exitCode: number }>(resolve => {
    const proc = Bun.spawn({
      cmd: [bunExe(), "install", "--no-progress", "--no-summary"],
      cwd: dir,
      env: {
        ...bunEnv,
        NPM_CONFIG_REGISTRY: "http://localhost:9999/", // Dead URL
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    proc.exited.then(exitCode => {
      Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]).then(([stdout, stderr]) => {
        resolve({ stdout, stderr, exitCode });
      });
    });
  }));

  expect(exitCode).toBe(0);

  // The key test: should not make network requests for packages that exist in workspace
  // When devDependencies are prioritized over peerDependencies, the workspace version should be used
  expect(stderr).not.toContain("GET");
  expect(stderr).not.toContain("404");
  expect(stderr).not.toContain("http");

  // Check that the lockfile was created correctly
  const lockfilePath = join(dir, "bun.lock");
  expect(await Bun.file(lockfilePath).exists()).toBe(true);

  // Verify that version 15.0.0-canary.119 (devDependency) was used
  // If peer range was used, it would try to fetch a stable version from npm and fail
  const testResult = await new Promise<string>(resolve => {
    const proc = Bun.spawn({
      cmd: [bunExe(), "packages/web/test.js"],
      cwd: dir,
      env: bunEnv,
      stdout: "pipe",
    });

    new Response(proc.stdout).text().then(resolve);
  });

  expect(testResult.trim()).toBe("15.0.0-canary.119");
});
