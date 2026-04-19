pub const DiscordCommand = struct {
    const discord_url = "https://script.dev/parabun";
    pub fn exec(_: std.mem.Allocator) !void {
        open.openURL(discord_url);
    }
};

const bun = @import("bun");
const open = @import("../open.zig");
const std = @import("std");
