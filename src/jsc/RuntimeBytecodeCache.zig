/// Runtime bytecode cache: stores pre-generated JSC bytecode for transpiled
/// modules so subsequent loads skip JSC's parse step.
///
/// Cache key encodes input_hash + features_hash + module_format +
/// parabun_parser_version. Any change invalidates the entry.
/// Files are stored in @bc@/ alongside the transpiler cache @t@/.
const RuntimeBytecodeCache = @This();

const debug = Output.scoped(.bytecode_cache, .visible);

pub var is_disabled: bool = false;

threadlocal var cache_dir_static_buf: bun.PathBuffer = undefined;
threadlocal var cache_dir_cached: ?[:0]const u8 = null;

pub fn cacheKey(input_hash: u64, features_hash: u64, input_byte_length: u64, is_cjs: bool) u64 {
    var hasher = std.hash.Wyhash.init(0xbc);
    hasher.update(std.mem.asBytes(&input_hash));
    hasher.update(std.mem.asBytes(&features_hash));
    hasher.update(std.mem.asBytes(&input_byte_length));
    hasher.update(&[_]u8{@intFromBool(is_cjs)});
    hasher.update(std.mem.asBytes(&bun.parabun_parser_version));
    return hasher.final();
}

fn writeCacheFilename(buf: []u8, key: u64) !usize {
    const fmt_name = if (comptime bun.Environment.allow_assert) "{x}.debug.jsc" else "{x}.jsc";
    const printed = try std.fmt.bufPrint(buf, fmt_name, .{std.mem.asBytes(&key)});
    return printed.len;
}

fn getCacheDir(buf: *bun.PathBuffer) ![:0]const u8 {
    if (is_disabled) return error.CacheDisabled;
    const dir = cache_dir_cached orelse blk: {
        const d = computeCacheDir(&cache_dir_static_buf);
        if (d.len == 0) {
            is_disabled = true;
            return error.CacheDisabled;
        }
        cache_dir_cached = d;
        break :blk d;
    };
    @memcpy(buf[0..dir.len], dir);
    buf[dir.len] = 0;
    return buf[0..dir.len :0];
}

fn computeCacheDir(buf: *bun.PathBuffer) [:0]const u8 {
    if (bun.env_var.BUN_RUNTIME_TRANSPILER_CACHE_PATH.get()) |dir| {
        if (dir.len == 0 or (dir.len == 1 and dir[0] == '0')) {
            return "";
        }
        const parent = std.fs.path.dirname(dir) orelse dir;
        const parts = &[_][]const u8{ parent, "@bc@" };
        return bun.fs.FileSystem.instance.absBufZ(parts, buf);
    }

    if (bun.env_var.XDG_CACHE_HOME.get()) |dir| {
        const parts = &[_][]const u8{ dir, "bun", "@bc@" };
        return bun.fs.FileSystem.instance.absBufZ(parts, buf);
    }

    if (comptime bun.Environment.isMac) {
        if (bun.env_var.HOME.get()) |home| {
            const parts = &[_][]const u8{ home, "Library/", "Caches/", "bun", "@bc@" };
            return bun.fs.FileSystem.instance.absBufZ(parts, buf);
        }
    }

    if (bun.env_var.HOME.get()) |dir| {
        const parts = &[_][]const u8{ dir, ".bun", "install", "cache", "@bc@" };
        return bun.fs.FileSystem.instance.absBufZ(parts, buf);
    }

    {
        const parts = &[_][]const u8{ bun.fs.FileSystem.RealFS.tmpdirPath(), "bun", "@bc@" };
        return bun.fs.FileSystem.instance.absBufZ(parts, buf);
    }
}

fn getCacheFilePath(buf: *bun.PathBuffer, key: u64) ![:0]const u8 {
    const cache_dir = try getCacheDir(buf);
    buf[cache_dir.len] = std.fs.path.sep;
    const fname_len = try writeCacheFilename(buf[cache_dir.len + 1 ..], key);
    buf[cache_dir.len + 1 + fname_len] = 0;
    return buf[0 .. cache_dir.len + 1 + fname_len :0];
}

pub fn load(key: u64, allocator: std.mem.Allocator) ![]u8 {
    if (is_disabled) return error.CacheDisabled;

    var path_buf: bun.PathBuffer = undefined;
    const cache_path = try getCacheFilePath(&path_buf, key);

    const fd = try bun.sys.open(cache_path, bun.O.RDONLY, 0).unwrap();
    defer fd.close();

    const file = fd.stdFile();
    const size = try file.getEndPos();
    if (size == 0) return error.EmptyCache;

    const buf = try allocator.alloc(u8, size);
    errdefer allocator.free(buf);

    const read = try file.preadAll(buf, 0);
    if (read != size) return error.ShortRead;

    debug("cache hit: {d} bytes from {s}", .{ size, cache_path });
    return buf;
}

pub fn save(key: u64, bytecode: []const u8) !void {
    if (is_disabled) return error.CacheDisabled;
    if (bytecode.len == 0) return;

    var path_buf: bun.PathBuffer = undefined;
    const cache_path = try getCacheFilePath(&path_buf, key);

    const cache_dir_path = std.fs.path.dirname(cache_path) orelse return error.NoCacheDir;
    var dir = try std.fs.cwd().makeOpenPath(cache_dir_path, .{ .access_sub_paths = true });
    defer dir.close();

    const cache_dir_fd = try bun.FD.fromStdDir(dir).makeLibUVOwned();
    defer {
        if (cache_dir_fd != bun.FD.cwd()) cache_dir_fd.close();
    }

    var tmpname_buf: bun.PathBuffer = undefined;
    const tmpfilename = try bun.fs.FileSystem.tmpname(
        std.fs.path.extension(cache_path),
        &tmpname_buf,
        key,
    );

    var tmpfile = try bun.Tmpfile.create(cache_dir_fd, tmpfilename).unwrap();
    defer tmpfile.fd.close();

    {
        errdefer {
            if (!tmpfile.using_tmpfile) {
                _ = bun.sys.unlinkat(cache_dir_fd, tmpfilename);
            }
        }

        bun.sys.preallocate_file(tmpfile.fd.cast(), 0, @intCast(bytecode.len)) catch {};

        var position: isize = 0;
        const end: isize = @intCast(bytecode.len);
        const vec = [_]bun.PlatformIOVecConst{bun.platformIOVecConstCreate(bytecode)};

        while (position < end) {
            const written = try bun.sys.pwritev(tmpfile.fd, &vec, position).unwrap();
            if (written <= 0) return error.WriteFailed;
            position += @intCast(written);
        }
    }

    try tmpfile.finish(@ptrCast(std.fs.path.basename(cache_path)));
    debug("saved {d} bytes to {s}", .{ bytecode.len, cache_path });
}

/// Generate JSC bytecode from transpiled JS and cache it.
/// Returns bytecode buffer allocated with `allocator`, or null on failure.
pub fn getOrGenerate(
    input_hash: u64,
    features_hash: u64,
    input_byte_length: u64,
    is_cjs: bool,
    transpiled_js: []const u8,
    path_text: []const u8,
    allocator: std.mem.Allocator,
) ?[]u8 {
    if (is_disabled) return null;
    if (transpiled_js.len == 0) return null;

    const key = cacheKey(input_hash, features_hash, input_byte_length, is_cjs);

    if (load(key, allocator)) |cached| {
        return cached;
    } else |_| {}

    var source_url = bun.String.cloneLatin1(path_text);
    defer source_url.deref();

    const format: bun.options.Format = if (is_cjs) .cjs else .esm;
    const result = jsc.CachedBytecode.generate(format, transpiled_js, &source_url) orelse return null;
    const bytecode, const cached_bytecode = result;
    defer cached_bytecode.deref();

    save(key, bytecode) catch |err| {
        debug("save failed: {s}", .{@errorName(err)});
    };

    const buf = allocator.dupe(u8, bytecode) catch return null;
    debug("generated {d} bytes for {s}", .{ buf.len, path_text });
    return buf;
}

const std = @import("std");
const bun = @import("bun");
const jsc = bun.jsc;
const Output = bun.Output;
