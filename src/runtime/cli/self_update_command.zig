//! `parabun self-update` — pulls the latest Parabun binary + VS Code
//! extension using the published install scripts.
//!
//! This is intentionally a thin shell-out rather than a port of the
//! upstream `bun upgrade` machinery: the install scripts already know
//! about platform detection, tag pinning, VSIX dispatch across code /
//! cursor / kiro, and release URLs, and keeping them as the single
//! source of truth means a Parabun user running `parabun self-update`
//! follows the exact same code path as a fresh curl-install.
//!
//! Binary:
//!   curl -fsSL https://raw.githubusercontent.com/airgap/parabun/main/install.sh | bash
//! VS Code extension:
//!   curl -fsSL https://raw.githubusercontent.com/airgap/parabun/main/install-extension.sh | bash

pub const SelfUpdateCommand = struct {
    const binary_install_url = "https://raw.githubusercontent.com/airgap/parabun/main/install.sh";
    const extension_install_url = "https://raw.githubusercontent.com/airgap/parabun/main/install-extension.sh";

    pub fn exec(ctx: Command.Context) !void {
        _ = ctx;

        if (Environment.isWindows) {
            Output.prettyErrorln(
                "<r><red>error<r>: <b>parabun self-update<r> currently requires a POSIX shell (bash + curl). " ++
                    "On Windows, install manually via the PowerShell installer at " ++
                    "<b>https://raw.githubusercontent.com/airgap/parabun/main/src/cli/install.ps1<r>.",
                .{},
            );
            Global.exit(1);
        }

        Output.prettyln("<r><b><cyan>parabun self-update<r> — updating binary + VS Code extension\n", .{});
        Output.flush();

        try runCurlInstaller("binary", binary_install_url);
        try runCurlInstaller("VS Code extension", extension_install_url);

        Output.prettyln("\n<r><green>✓<r> <b>Parabun is up to date.<r>", .{});
        Output.flush();
    }

    fn runCurlInstaller(label: []const u8, url: []const u8) !void {
        Output.prettyln("<r><cyan>→<r> fetching {s} installer ({s})", .{ label, url });
        Output.flush();

        // Keep `set -euo pipefail` semantics so a curl error kills the
        // piped bash immediately instead of running an empty script.
        const script = std.fmt.allocPrint(
            bun.default_allocator,
            "set -euo pipefail && curl -fsSL {s} | bash",
            .{url},
        ) catch bun.outOfMemory();
        defer bun.default_allocator.free(script);

        // `bash -c` inherits our stdin/stdout/stderr so download progress
        // bars and per-editor install messages stream live.
        const proc = bun.spawnSync(&.{
            .argv = &.{ "/bin/bash", "-c", script },
            .envp = null,
            .cwd = ".",
            .stdin = .inherit,
            .stdout = .inherit,
            .stderr = .inherit,
            .windows = if (Environment.isWindows) .{
                .loop = bun.jsc.EventLoopHandle.init(bun.jsc.MiniEventLoop.initGlobal(null, null)),
            },
        }) catch |err| {
            Output.errGeneric("Failed to spawn bash for {s} installer: {s}", .{ label, @errorName(err) });
            Global.exit(1);
        };

        switch (proc) {
            .err => |err| {
                Output.err(err, "Failed to run {s} installer", .{label});
                Global.exit(1);
            },
            .result => |result| {
                defer result.deinit();
                if (!result.status.isOK()) {
                    Output.errGeneric("{s} installer exited with status {any}", .{ label, result.status });
                    Global.exit(1);
                }
            },
        }
    }
};

const bun = @import("bun");
const std = @import("std");
const Command = bun.cli.Command;
const Environment = bun.Environment;
const Global = bun.Global;
const Output = bun.Output;
