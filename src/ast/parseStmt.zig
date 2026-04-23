pub fn ParseStmt(
    comptime parser_feature__typescript: bool,
    comptime parser_feature__jsx: JSXTransformType,
    comptime parser_feature__scan_only: bool,
) type {
    return struct {
        const P = js_parser.NewParser_(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only);
        const createDefaultName = P.createDefaultName;
        const extractDeclsForBinding = P.extractDeclsForBinding;
        const is_typescript_enabled = P.is_typescript_enabled;
        const track_symbol_usage_during_parse_pass = P.track_symbol_usage_during_parse_pass;

        fn t_semicolon(p: *P) anyerror!Stmt {
            try p.lexer.next();
            return Stmt.empty();
        }

        fn t_export(p: *P, opts: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            const previous_export_keyword = p.esm_export_keyword;
            if (opts.is_module_scope) {
                p.esm_export_keyword = p.lexer.range();
            } else if (!opts.is_namespace_scope) {
                try p.lexer.unexpected();
                return error.SyntaxError;
            }
            try p.lexer.next();

            // TypeScript decorators only work on class declarations
            // "@decorator export class Foo {}"
            // "@decorator export abstract class Foo {}"
            // "@decorator export default class Foo {}"
            // "@decorator export default abstract class Foo {}"
            // "@decorator export declare class Foo {}"
            // "@decorator export declare abstract class Foo {}"
            if (opts.ts_decorators != null and p.lexer.token != js_lexer.T.t_class and
                p.lexer.token != js_lexer.T.t_default and
                !p.lexer.isContextualKeyword("abstract") and
                !p.lexer.isContextualKeyword("declare"))
            {
                try p.lexer.expected(js_lexer.T.t_class);
            }

            switch (p.lexer.token) {
                T.t_class, T.t_const, T.t_function, T.t_var => {
                    opts.is_export = true;
                    return p.parseStmt(opts);
                },

                T.t_import => {
                    // "export import foo = bar"
                    if (is_typescript_enabled and (opts.is_module_scope or opts.is_namespace_scope)) {
                        opts.is_export = true;
                        return p.parseStmt(opts);
                    }

                    try p.lexer.unexpected();
                    return error.SyntaxError;
                },

                T.t_enum => {
                    if (!is_typescript_enabled) {
                        try p.lexer.unexpected();
                        return error.SyntaxError;
                    }

                    opts.is_export = true;
                    return p.parseStmt(opts);
                },

                T.t_identifier => {
                    if (p.lexer.isContextualKeyword("let")) {
                        opts.is_export = true;
                        return p.parseStmt(opts);
                    }

                    if (comptime is_typescript_enabled) {
                        if (opts.is_typescript_declare and p.lexer.isContextualKeyword("as")) {
                            // "export as namespace ns;"
                            try p.lexer.next();
                            try p.lexer.expectContextualKeyword("namespace");
                            try p.lexer.expect(T.t_identifier);
                            try p.lexer.expectOrInsertSemicolon();

                            return p.s(S.TypeScript{}, loc);
                        }
                    }

                    // Parabun: "export memo name(...)" / "export memo async name(...)"
                    if (p.lexer.isContextualKeyword("memo")) {
                        const memo_range = p.lexer.range();
                        try p.lexer.next();
                        if (p.lexer.has_newline_before) {
                            try p.log.addRangeError(p.source, memo_range, "Unexpected newline after \"memo\"");
                            return error.SyntaxError;
                        }
                        opts.is_export = true;
                        return try parseMemoFnStmt(p, opts, memo_range);
                    }

                    // Parabun: "export pure function" / "export pure async function"
                    if (p.lexer.isContextualKeyword("pure")) {
                        const pure_range = p.lexer.range();
                        try p.lexer.next();
                        if (p.lexer.has_newline_before) {
                            try p.log.addRangeError(p.source, pure_range, "Unexpected newline after \"pure\"");
                        }

                        if (p.lexer.isContextualKeyword("async")) {
                            const asyncRange = p.lexer.range();
                            try p.lexer.next();
                            if (p.lexer.has_newline_before) {
                                try p.log.addRangeError(p.source, asyncRange, "Unexpected newline after \"async\"");
                            }
                            try p.lexer.expect(T.t_function);
                            opts.is_export = true;
                            return try p.parseFnStmt(loc, opts, asyncRange, true);
                        }

                        try p.lexer.expect(T.t_function);
                        opts.is_export = true;
                        return try p.parseFnStmt(loc, opts, null, true);
                    }

                    if (p.lexer.isContextualKeyword("async")) {
                        const asyncRange = p.lexer.range();
                        try p.lexer.next();
                        if (p.lexer.has_newline_before) {
                            try p.log.addRangeError(p.source, asyncRange, "Unexpected newline after \"async\"");
                        }

                        try p.lexer.expect(T.t_function);
                        opts.is_export = true;
                        return try p.parseFnStmt(loc, opts, asyncRange, false);
                    }

                    if (is_typescript_enabled) {
                        if (TypeScript.Identifier.forStr(p.lexer.identifier)) |ident| {
                            switch (ident) {
                                .s_type => {
                                    // "export type foo = ..."
                                    const type_range = p.lexer.range();
                                    try p.lexer.next();
                                    if (p.lexer.has_newline_before) {
                                        try p.log.addErrorFmt(p.source, type_range.end(), p.allocator, "Unexpected newline after \"type\"", .{});
                                        return error.SyntaxError;
                                    }
                                    var skipper = ParseStatementOptions{ .is_module_scope = opts.is_module_scope, .is_export = true };
                                    try p.skipTypeScriptTypeStmt(&skipper);
                                    return p.s(S.TypeScript{}, loc);
                                },
                                .s_namespace, .s_abstract, .s_module, .s_interface => {
                                    // "export namespace Foo {}"
                                    // "export abstract class Foo {}"
                                    // "export module Foo {}"
                                    // "export interface Foo {}"
                                    opts.is_export = true;
                                    return try p.parseStmt(opts);
                                },
                                .s_declare => {
                                    // "export declare class Foo {}"
                                    opts.is_export = true;
                                    opts.lexical_decl = .allow_all;
                                    opts.is_typescript_declare = true;
                                    return try p.parseStmt(opts);
                                },
                            }
                        }
                    }

                    try p.lexer.unexpected();
                    return error.SyntaxError;
                },

                T.t_default => {
                    if (!opts.is_module_scope and (!opts.is_namespace_scope or !opts.is_typescript_declare)) {
                        try p.lexer.unexpected();
                        return error.SyntaxError;
                    }

                    const defaultLoc = p.lexer.loc();
                    try p.lexer.next();

                    // TypeScript decorators only work on class declarations
                    // "@decorator export default class Foo {}"
                    // "@decorator export default abstract class Foo {}"
                    if (opts.ts_decorators != null and p.lexer.token != T.t_class and !p.lexer.isContextualKeyword("abstract")) {
                        try p.lexer.expected(T.t_class);
                    }

                    if (p.lexer.isContextualKeyword("async")) {
                        const async_range = p.lexer.range();
                        try p.lexer.next();
                        if (p.lexer.token == T.t_function and !p.lexer.has_newline_before) {
                            try p.lexer.next();
                            var stmtOpts = ParseStatementOptions{
                                .is_name_optional = true,
                                .lexical_decl = .allow_all,
                            };
                            const stmt = try p.parseFnStmt(loc, &stmtOpts, async_range, false);
                            if (@as(Stmt.Tag, stmt.data) == .s_type_script) {
                                // This was just a type annotation
                                return stmt;
                            }

                            const defaultName = if (stmt.data.s_function.func.name) |name|
                                js_ast.LocRef{ .loc = name.loc, .ref = name.ref }
                            else
                                try p.createDefaultName(defaultLoc);

                            const value = js_ast.StmtOrExpr{ .stmt = stmt };
                            return p.s(S.ExportDefault{ .default_name = defaultName, .value = value }, loc);
                        }

                        const defaultName = try createDefaultName(p, loc);

                        var expr = try p.parseAsyncPrefixExpr(async_range, Level.comma);
                        try p.parseSuffix(&expr, Level.comma, null, Expr.EFlags.none);
                        try p.lexer.expectOrInsertSemicolon();
                        const value = js_ast.StmtOrExpr{ .expr = expr };
                        p.has_export_default = true;
                        return p.s(S.ExportDefault{ .default_name = defaultName, .value = value }, loc);
                    }

                    if (p.lexer.token == .t_function or p.lexer.token == .t_class or p.lexer.isContextualKeyword("interface")) {
                        var _opts = ParseStatementOptions{
                            .ts_decorators = opts.ts_decorators,
                            .is_name_optional = true,
                            .lexical_decl = .allow_all,
                        };
                        const stmt = try p.parseStmt(&_opts);

                        const default_name: js_ast.LocRef = default_name_getter: {
                            switch (stmt.data) {
                                // This was just a type annotation
                                .s_type_script => {
                                    return stmt;
                                },

                                .s_function => |func_container| {
                                    if (func_container.func.name) |name| {
                                        break :default_name_getter LocRef{ .loc = name.loc, .ref = name.ref };
                                    }
                                },
                                .s_class => |class| {
                                    if (class.class.class_name) |name| {
                                        break :default_name_getter LocRef{ .loc = name.loc, .ref = name.ref };
                                    }
                                },
                                else => {},
                            }

                            break :default_name_getter createDefaultName(p, defaultLoc) catch unreachable;
                        };
                        p.has_export_default = true;
                        p.has_es_module_syntax = true;
                        return p.s(
                            S.ExportDefault{ .default_name = default_name, .value = js_ast.StmtOrExpr{ .stmt = stmt } },
                            loc,
                        );
                    }

                    const is_identifier = p.lexer.token == .t_identifier;
                    const name = p.lexer.identifier;
                    const expr = try p.parseExpr(.comma);

                    // Handle the default export of an abstract class in TypeScript
                    if (is_typescript_enabled and is_identifier and (p.lexer.token == .t_class or opts.ts_decorators != null) and strings.eqlComptime(name, "abstract")) {
                        switch (expr.data) {
                            .e_identifier => {
                                var stmtOpts = ParseStatementOptions{
                                    .ts_decorators = opts.ts_decorators,
                                    .is_name_optional = true,
                                };
                                const stmt: Stmt = try p.parseClassStmt(loc, &stmtOpts);

                                // Use the statement name if present, since it's a better name
                                const default_name: js_ast.LocRef = default_name_getter: {
                                    switch (stmt.data) {
                                        // This was just a type annotation
                                        .s_type_script => {
                                            return stmt;
                                        },

                                        .s_function => |func_container| {
                                            if (func_container.func.name) |_name| {
                                                break :default_name_getter LocRef{ .loc = defaultLoc, .ref = _name.ref };
                                            }
                                        },
                                        .s_class => |class| {
                                            if (class.class.class_name) |_name| {
                                                break :default_name_getter LocRef{ .loc = defaultLoc, .ref = _name.ref };
                                            }
                                        },
                                        else => {},
                                    }

                                    break :default_name_getter createDefaultName(p, defaultLoc) catch unreachable;
                                };
                                p.has_export_default = true;
                                return p.s(S.ExportDefault{ .default_name = default_name, .value = js_ast.StmtOrExpr{ .stmt = stmt } }, loc);
                            },
                            else => {
                                p.panic("internal error: unexpected", .{});
                            },
                        }
                    }

                    try p.lexer.expectOrInsertSemicolon();

                    // Use the expression name if present, since it's a better name
                    p.has_export_default = true;
                    return p.s(
                        S.ExportDefault{
                            .default_name = p.defaultNameForExpr(expr, defaultLoc),
                            .value = js_ast.StmtOrExpr{
                                .expr = expr,
                            },
                        },
                        loc,
                    );
                },
                T.t_asterisk => {
                    if (!opts.is_module_scope and !(opts.is_namespace_scope or !opts.is_typescript_declare)) {
                        try p.lexer.unexpected();
                        return error.SyntaxError;
                    }

                    try p.lexer.next();
                    var namespace_ref: Ref = Ref.None;
                    var alias: ?js_ast.G.ExportStarAlias = null;
                    var path: ParsedPath = undefined;

                    if (p.lexer.isContextualKeyword("as")) {
                        // "export * as ns from 'path'"
                        try p.lexer.next();
                        const name = try p.parseClauseAlias("export");
                        namespace_ref = try p.storeNameInRef(name);
                        alias = G.ExportStarAlias{ .loc = p.lexer.loc(), .original_name = name };
                        try p.lexer.next();
                        try p.lexer.expectContextualKeyword("from");
                        path = try p.parsePath();
                    } else {
                        // "export * from 'path'"
                        try p.lexer.expectContextualKeyword("from");
                        path = try p.parsePath();
                        const name = try fs.PathName.init(path.text).nonUniqueNameString(p.allocator);
                        namespace_ref = try p.storeNameInRef(name);
                    }

                    const import_record_index = p.addImportRecord(
                        ImportKind.stmt,
                        path.loc,
                        path.text,
                        // TODO: import assertions
                        // path.assertions
                    );

                    if (path.is_macro) {
                        try p.log.addError(p.source, path.loc, "cannot use macro in export statement");
                    } else if (path.import_tag != .none) {
                        try p.log.addError(p.source, loc, "cannot use export statement with \"type\" attribute");
                    }

                    if (comptime track_symbol_usage_during_parse_pass) {
                        // In the scan pass, we need _some_ way of knowing *not* to mark as unused
                        p.import_records.items[import_record_index].flags.calls_runtime_re_export_fn = true;
                    }

                    try p.lexer.expectOrInsertSemicolon();
                    p.has_es_module_syntax = true;
                    return p.s(S.ExportStar{
                        .namespace_ref = namespace_ref,
                        .alias = alias,
                        .import_record_index = import_record_index,
                    }, loc);
                },
                T.t_open_brace => {
                    if (!opts.is_module_scope and !(opts.is_namespace_scope or !opts.is_typescript_declare)) {
                        try p.lexer.unexpected();
                        return error.SyntaxError;
                    }

                    const export_clause = try p.parseExportClause();
                    if (p.lexer.isContextualKeyword("from")) {
                        try p.lexer.expectContextualKeyword("from");
                        const parsedPath = try p.parsePath();

                        try p.lexer.expectOrInsertSemicolon();

                        if (comptime is_typescript_enabled) {
                            // export {type Foo} from 'bar';
                            // ->
                            // nothing
                            // https://www.typescriptlang.org/play?useDefineForClassFields=true&esModuleInterop=false&declaration=false&target=99&isolatedModules=false&ts=4.5.4#code/KYDwDg9gTgLgBDAnmYcDeAxCEC+cBmUEAtnAOQBGAhlGQNwBQQA
                            if (export_clause.clauses.len == 0 and export_clause.had_type_only_exports) {
                                return p.s(S.TypeScript{}, loc);
                            }
                        }

                        if (parsedPath.is_macro) {
                            try p.log.addError(p.source, loc, "export from cannot be used with \"type\": \"macro\"");
                        } else if (parsedPath.import_tag != .none) {
                            try p.log.addError(p.source, loc, "export from cannot be used with \"type\" attribute");
                        }

                        const import_record_index = p.addImportRecord(.stmt, parsedPath.loc, parsedPath.text);
                        const path_name = fs.PathName.init(parsedPath.text);
                        const namespace_ref = p.storeNameInRef(
                            std.fmt.allocPrint(
                                p.allocator,
                                "import_{f}",
                                .{
                                    path_name.fmtIdentifier(),
                                },
                            ) catch |err| bun.handleOom(err),
                        ) catch |err| bun.handleOom(err);

                        if (comptime track_symbol_usage_during_parse_pass) {
                            // In the scan pass, we need _some_ way of knowing *not* to mark as unused
                            p.import_records.items[import_record_index].flags.calls_runtime_re_export_fn = true;
                        }
                        p.current_scope.is_after_const_local_prefix = true;
                        p.has_es_module_syntax = true;
                        return p.s(
                            S.ExportFrom{
                                .items = export_clause.clauses,
                                .is_single_line = export_clause.is_single_line,
                                .namespace_ref = namespace_ref,
                                .import_record_index = import_record_index,
                            },
                            loc,
                        );
                    }
                    try p.lexer.expectOrInsertSemicolon();

                    if (comptime is_typescript_enabled) {
                        // export {type Foo};
                        // ->
                        // nothing
                        // https://www.typescriptlang.org/play?useDefineForClassFields=true&esModuleInterop=false&declaration=false&target=99&isolatedModules=false&ts=4.5.4#code/KYDwDg9gTgLgBDAnmYcDeAxCEC+cBmUEAtnAOQBGAhlGQNwBQQA
                        if (export_clause.clauses.len == 0 and export_clause.had_type_only_exports) {
                            return p.s(S.TypeScript{}, loc);
                        }
                    }
                    p.has_es_module_syntax = true;
                    return p.s(S.ExportClause{
                        .items = export_clause.clauses,
                        .is_single_line = export_clause.is_single_line,
                    }, loc);
                },
                T.t_equals => {
                    // "export = value;"

                    p.esm_export_keyword = previous_export_keyword; // This wasn't an ESM export statement after all
                    if (is_typescript_enabled) {
                        try p.lexer.next();
                        const value = try p.parseExpr(.lowest);
                        try p.lexer.expectOrInsertSemicolon();
                        return p.s(S.ExportEquals{ .value = value }, loc);
                    }
                    try p.lexer.unexpected();
                    return error.SyntaxError;
                },
                else => {
                    try p.lexer.unexpected();
                    return error.SyntaxError;
                },
            }
        }

        fn t_function(p: *P, opts: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            try p.lexer.next();
            return try p.parseFnStmt(loc, opts, null, false);
        }
        fn t_enum(p: *P, opts: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            if (!is_typescript_enabled) {
                try p.lexer.unexpected();
                return error.SyntaxError;
            }
            return p.parseTypescriptEnumStmt(loc, opts);
        }
        fn t_at(p: *P, opts: *ParseStatementOptions) anyerror!Stmt {
            // Parse decorators before class statements, which are potentially exported
            if (is_typescript_enabled or p.options.features.standard_decorators) {
                const scope_index = p.scopes_in_order.items.len;
                const ts_decorators = try p.parseTypeScriptDecorators();

                // If this turns out to be a "declare class" statement, we need to undo the
                // scopes that were potentially pushed while parsing the decorator arguments.
                // That can look like any one of the following:
                //
                //   "@decorator declare class Foo {}"
                //   "@decorator declare abstract class Foo {}"
                //   "@decorator export declare class Foo {}"
                //   "@decorator export declare abstract class Foo {}"
                //
                opts.ts_decorators = DeferredTsDecorators{
                    .values = ts_decorators,
                    .scope_index = scope_index,
                };

                // "@decorator class Foo {}"
                // "@decorator abstract class Foo {}"
                // "@decorator declare class Foo {}"
                // "@decorator declare abstract class Foo {}"
                // "@decorator export class Foo {}"
                // "@decorator export abstract class Foo {}"
                // "@decorator export declare class Foo {}"
                // "@decorator export declare abstract class Foo {}"
                // "@decorator export default class Foo {}"
                // "@decorator export default abstract class Foo {}"
                if (p.lexer.token != .t_class and p.lexer.token != .t_export and
                    !(is_typescript_enabled and p.lexer.isContextualKeyword("abstract")) and
                    !(is_typescript_enabled and p.lexer.isContextualKeyword("declare")))
                {
                    try p.lexer.expected(.t_class);
                }

                return p.parseStmt(opts);
            }
            // notimpl();

            try p.lexer.unexpected();
            return error.SyntaxError;
        }
        fn t_class(p: *P, opts: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            if (opts.lexical_decl != .allow_all) {
                try p.forbidLexicalDecl(loc);
            }

            return try p.parseClassStmt(loc, opts);
        }
        fn t_var(p: *P, opts: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            try p.lexer.next();
            var decls = try p.parseAndDeclareDecls(.hoisted, opts);
            try p.lexer.expectOrInsertSemicolon();
            return p.s(S.Local{
                .kind = .k_var,
                .decls = Decl.List.moveFromList(&decls),
                .is_export = opts.is_export,
            }, loc);
        }
        fn t_const(p: *P, opts: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            if (opts.lexical_decl != .allow_all) {
                try p.forbidLexicalDecl(loc);
            }
            // p.markSyntaxFeature(compat.Const, p.lexer.Range())

            try p.lexer.next();

            if (is_typescript_enabled and p.lexer.token == T.t_enum) {
                return p.parseTypescriptEnumStmt(loc, opts);
            }

            var decls = try p.parseAndDeclareDecls(.constant, opts);
            try p.lexer.expectOrInsertSemicolon();

            if (!opts.is_typescript_declare) {
                try p.requireInitializers(.k_const, decls.items);
            }

            return p.s(S.Local{
                .kind = .k_const,
                .decls = Decl.List.moveFromList(&decls),
                .is_export = opts.is_export,
            }, loc);
        }
        fn t_if(p: *P, _: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            var current_loc = loc;
            var root_if: ?Stmt = null;
            var current_if: ?*S.If = null;

            while (true) {
                try p.lexer.next();
                try p.lexer.expect(.t_open_paren);
                const test_ = try p.parseExpr(.lowest);
                try p.lexer.expect(.t_close_paren);
                var stmtOpts = ParseStatementOptions{
                    .lexical_decl = .allow_fn_inside_if,
                };
                const yes = try p.parseStmt(&stmtOpts);

                // Create the if node
                const if_stmt = p.s(S.If{
                    .test_ = test_,
                    .yes = yes,
                    .no = null,
                }, current_loc);

                // First if statement becomes root
                if (root_if == null) {
                    root_if = if_stmt;
                }

                // Link to previous if statement's else branch
                if (current_if) |prev_if| {
                    prev_if.no = if_stmt;
                }

                // Set current if for next iteration
                current_if = if_stmt.data.s_if;

                if (p.lexer.token != .t_else) {
                    return root_if.?;
                }

                try p.lexer.next();

                // Handle final else
                if (p.lexer.token != .t_if) {
                    stmtOpts = ParseStatementOptions{
                        .lexical_decl = .allow_fn_inside_if,
                    };
                    current_if.?.no = try p.parseStmt(&stmtOpts);
                    return root_if.?;
                }

                // Continue with else if
                current_loc = p.lexer.loc();
            }

            unreachable;
        }
        fn t_do(p: *P, _: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            try p.lexer.next();
            var stmtOpts = ParseStatementOptions{};
            const body = try p.parseStmt(&stmtOpts);
            try p.lexer.expect(.t_while);
            try p.lexer.expect(.t_open_paren);
            const test_ = try p.parseExpr(.lowest);
            try p.lexer.expect(.t_close_paren);

            // This is a weird corner case where automatic semicolon insertion applies
            // even without a newline present
            if (p.lexer.token == .t_semicolon) {
                try p.lexer.next();
            }
            return p.s(S.DoWhile{ .body = body, .test_ = test_ }, loc);
        }
        fn t_while(p: *P, _: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            try p.lexer.next();

            try p.lexer.expect(.t_open_paren);
            const test_ = try p.parseExpr(.lowest);
            try p.lexer.expect(.t_close_paren);

            var stmtOpts = ParseStatementOptions{};
            const body = try p.parseStmt(&stmtOpts);

            return p.s(S.While{
                .body = body,
                .test_ = test_,
            }, loc);
        }
        fn t_with(p: *P, _: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            try p.lexer.next();
            try p.lexer.expect(.t_open_paren);
            const test_ = try p.parseExpr(.lowest);
            const body_loc = p.lexer.loc();
            try p.lexer.expect(.t_close_paren);

            // Push a scope so we make sure to prevent any bare identifiers referenced
            // within the body from being renamed. Renaming them might change the
            // semantics of the code.
            _ = try p.pushScopeForParsePass(.with, body_loc);
            var stmtOpts = ParseStatementOptions{};
            const body = try p.parseStmt(&stmtOpts);
            p.popScope();

            return p.s(S.With{ .body = body, .body_loc = body_loc, .value = test_ }, loc);
        }
        fn t_switch(p: *P, _: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            try p.lexer.next();

            try p.lexer.expect(.t_open_paren);
            const test_ = try p.parseExpr(.lowest);
            try p.lexer.expect(.t_close_paren);

            const body_loc = p.lexer.loc();
            _ = try p.pushScopeForParsePass(.block, body_loc);
            defer p.popScope();

            try p.lexer.expect(.t_open_brace);
            var cases = ListManaged(js_ast.Case).init(p.allocator);
            var foundDefault = false;
            var stmtOpts = ParseStatementOptions{ .lexical_decl = .allow_all };
            var value: ?js_ast.Expr = null;
            while (p.lexer.token != .t_close_brace) {
                var body = StmtList.init(p.allocator);
                value = null;
                if (p.lexer.token == .t_default) {
                    if (foundDefault) {
                        try p.log.addRangeError(p.source, p.lexer.range(), "Multiple default clauses are not allowed");
                        return error.SyntaxError;
                    }

                    foundDefault = true;
                    try p.lexer.next();
                    try p.lexer.expect(.t_colon);
                } else {
                    try p.lexer.expect(.t_case);
                    value = try p.parseExpr(.lowest);
                    try p.lexer.expect(.t_colon);
                }

                caseBody: while (true) {
                    switch (p.lexer.token) {
                        .t_close_brace, .t_case, .t_default => {
                            break :caseBody;
                        },
                        else => {
                            stmtOpts = ParseStatementOptions{ .lexical_decl = .allow_all };
                            try body.append(try p.parseStmt(&stmtOpts));
                        },
                    }
                }
                try cases.append(js_ast.Case{ .value = value, .body = body.items, .loc = logger.Loc.Empty });
            }
            try p.lexer.expect(.t_close_brace);
            return p.s(S.Switch{ .test_ = test_, .body_loc = body_loc, .cases = cases.items }, loc);
        }
        fn t_try(p: *P, _: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            try p.lexer.next();
            const body_loc = p.lexer.loc();
            try p.lexer.expect(.t_open_brace);
            _ = try p.pushScopeForParsePass(.block, loc);
            var stmt_opts = ParseStatementOptions{};
            const body = try p.parseStmtsUpTo(.t_close_brace, &stmt_opts);
            p.popScope();
            try p.lexer.next();

            var catch_: ?js_ast.Catch = null;
            var finally: ?js_ast.Finally = null;

            if (p.lexer.token == .t_catch) {
                const catch_loc = p.lexer.loc();
                _ = try p.pushScopeForParsePass(.catch_binding, catch_loc);
                try p.lexer.next();
                var binding: ?js_ast.Binding = null;

                // The catch binding is optional, and can be omitted
                if (p.lexer.token != .t_open_brace) {
                    try p.lexer.expect(.t_open_paren);
                    var value = try p.parseBinding(.{});

                    // Skip over types
                    if (is_typescript_enabled and p.lexer.token == .t_colon) {
                        try p.lexer.expect(.t_colon);
                        try p.skipTypeScriptType(.lowest);
                    }

                    try p.lexer.expect(.t_close_paren);

                    // Bare identifiers are a special case
                    var kind = Symbol.Kind.other;
                    switch (value.data) {
                        .b_identifier => {
                            kind = .catch_identifier;
                        },
                        else => {},
                    }
                    try p.declareBinding(kind, &value, &stmt_opts);
                    binding = value;
                }

                const catch_body_loc = p.lexer.loc();
                try p.lexer.expect(.t_open_brace);

                _ = try p.pushScopeForParsePass(.block, catch_body_loc);
                const stmts = try p.parseStmtsUpTo(.t_close_brace, &stmt_opts);
                p.popScope();
                try p.lexer.next();
                catch_ = js_ast.Catch{
                    .loc = catch_loc,
                    .binding = binding,
                    .body = stmts,
                    .body_loc = catch_body_loc,
                };
                p.popScope();
            }

            if (p.lexer.token == .t_finally or catch_ == null) {
                const finally_loc = p.lexer.loc();
                _ = try p.pushScopeForParsePass(.block, finally_loc);
                try p.lexer.expect(.t_finally);
                try p.lexer.expect(.t_open_brace);
                const stmts = try p.parseStmtsUpTo(.t_close_brace, &stmt_opts);
                try p.lexer.next();
                finally = js_ast.Finally{ .loc = finally_loc, .stmts = stmts };
                p.popScope();
            }

            return p.s(
                S.Try{ .body_loc = body_loc, .body = body, .catch_ = catch_, .finally = finally },
                loc,
            );
        }
        fn t_for(p: *P, _: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            _ = try p.pushScopeForParsePass(.block, loc);
            defer p.popScope();

            try p.lexer.next();

            // "for await (let x of y) {}"
            var isForAwait = p.lexer.isContextualKeyword("await");
            if (isForAwait) {
                const await_range = p.lexer.range();
                if (p.fn_or_arrow_data_parse.allow_await != .allow_expr) {
                    try p.log.addRangeError(p.source, await_range, "Cannot use \"await\" outside an async function");
                    isForAwait = false;
                } else {
                    // TODO: improve error handling here
                    //                 didGenerateError := p.markSyntaxFeature(compat.ForAwait, awaitRange)
                    if (p.fn_or_arrow_data_parse.is_top_level) {
                        p.top_level_await_keyword = await_range;
                        // p.markSyntaxFeature(compat.TopLevelAwait, awaitRange)
                    }
                }
                try p.lexer.next();
            }

            try p.lexer.expect(.t_open_paren);

            var init_: ?Stmt = null;
            var test_: ?Expr = null;
            var update: ?Expr = null;

            // "in" expressions aren't allowed here
            p.allow_in = false;

            var bad_let_range: ?logger.Range = null;
            if (p.lexer.isContextualKeyword("let")) {
                bad_let_range = p.lexer.range();
            }

            var decls: G.Decl.List = .{};
            const init_loc = p.lexer.loc();
            var is_var = false;
            switch (p.lexer.token) {
                // for (var )
                .t_var => {
                    is_var = true;
                    try p.lexer.next();
                    var stmtOpts = ParseStatementOptions{};
                    var decls_list = try p.parseAndDeclareDecls(.hoisted, &stmtOpts);
                    decls = .moveFromList(&decls_list);
                    init_ = p.s(S.Local{ .kind = .k_var, .decls = decls }, init_loc);
                },
                // for (const )
                .t_const => {
                    try p.lexer.next();
                    var stmtOpts = ParseStatementOptions{};
                    var decls_list = try p.parseAndDeclareDecls(.constant, &stmtOpts);
                    decls = .moveFromList(&decls_list);
                    init_ = p.s(S.Local{ .kind = .k_const, .decls = decls }, init_loc);
                },
                // for (;)
                .t_semicolon => {},
                else => {
                    var stmtOpts = ParseStatementOptions{
                        .lexical_decl = .allow_all,
                        .is_for_loop_init = true,
                    };

                    const res = try p.parseExprOrLetStmt(&stmtOpts);
                    switch (res.stmt_or_expr) {
                        .stmt => |stmt| {
                            bad_let_range = null;
                            init_ = stmt;
                        },
                        .expr => |expr| {
                            init_ = p.s(S.SExpr{
                                .value = expr,
                            }, init_loc);
                        },
                    }
                },
            }

            // "in" expressions are allowed again
            p.allow_in = true;

            // Detect for-of loops
            if (p.lexer.isContextualKeyword("of") or isForAwait) {
                if (bad_let_range) |r| {
                    try p.log.addRangeError(p.source, r, "\"let\" must be wrapped in parentheses to be used as an expression here");
                    return error.SyntaxError;
                }

                if (isForAwait and !p.lexer.isContextualKeyword("of")) {
                    if (init_ != null) {
                        try p.lexer.expectedString("\"of\"");
                    } else {
                        try p.lexer.unexpected();
                        return error.SyntaxError;
                    }
                }

                try p.forbidInitializers(decls.slice(), "of", false);
                try p.lexer.next();
                const value = try p.parseExpr(.comma);
                try p.lexer.expect(.t_close_paren);
                var stmtOpts = ParseStatementOptions{};
                const body = try p.parseStmt(&stmtOpts);
                return p.s(S.ForOf{ .is_await = isForAwait, .init = init_ orelse unreachable, .value = value, .body = body }, loc);
            }

            // Detect for-in loops
            if (p.lexer.token == .t_in) {
                try p.forbidInitializers(decls.slice(), "in", is_var);
                try p.lexer.next();
                const value = try p.parseExpr(.lowest);
                try p.lexer.expect(.t_close_paren);
                var stmtOpts = ParseStatementOptions{};
                const body = try p.parseStmt(&stmtOpts);
                return p.s(S.ForIn{ .init = init_ orelse unreachable, .value = value, .body = body }, loc);
            }

            // Only require "const" statement initializers when we know we're a normal for loop
            if (init_) |init_stmt| {
                switch (init_stmt.data) {
                    .s_local => {
                        if (init_stmt.data.s_local.kind == .k_const) {
                            try p.requireInitializers(.k_const, decls.slice());
                        }
                    },
                    else => {},
                }
            }

            try p.lexer.expect(.t_semicolon);
            if (p.lexer.token != .t_semicolon) {
                test_ = try p.parseExpr(.lowest);
            }

            try p.lexer.expect(.t_semicolon);

            if (p.lexer.token != .t_close_paren) {
                update = try p.parseExpr(.lowest);
            }

            try p.lexer.expect(.t_close_paren);
            var stmtOpts = ParseStatementOptions{};
            const body = try p.parseStmt(&stmtOpts);
            return p.s(
                S.For{ .init = init_, .test_ = test_, .update = update, .body = body },
                loc,
            );
        }
        fn t_import(p: *P, opts: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            const previous_import_keyword = p.esm_import_keyword;
            p.esm_import_keyword = p.lexer.range();
            try p.lexer.next();
            var stmt: S.Import = S.Import{
                .namespace_ref = Ref.None,
                .import_record_index = std.math.maxInt(u32),
            };
            var was_originally_bare_import = false;

            // "export import foo = bar"
            if ((opts.is_export or (opts.is_namespace_scope and !opts.is_typescript_declare)) and p.lexer.token != .t_identifier) {
                try p.lexer.expected(.t_identifier);
            }

            switch (p.lexer.token) {
                // "import('path')"
                // "import.meta"
                .t_open_paren, .t_dot => {
                    p.esm_import_keyword = previous_import_keyword; // this wasn't an esm import statement after all
                    var expr = try p.parseImportExpr(loc, .lowest);
                    try p.parseSuffix(&expr, .lowest, null, Expr.EFlags.none);
                    try p.lexer.expectOrInsertSemicolon();
                    return p.s(S.SExpr{
                        .value = expr,
                    }, loc);
                },
                .t_string_literal, .t_no_substitution_template_literal => {
                    // "import 'path'"
                    if (!opts.is_module_scope and (!opts.is_namespace_scope or !opts.is_typescript_declare)) {
                        try p.lexer.unexpected();
                        return error.SyntaxError;
                    }
                    was_originally_bare_import = true;
                },
                .t_asterisk => {
                    // "import * as ns from 'path'"
                    if (!opts.is_module_scope and (!opts.is_namespace_scope or !opts.is_typescript_declare)) {
                        try p.lexer.unexpected();
                        return error.SyntaxError;
                    }

                    try p.lexer.next();
                    try p.lexer.expectContextualKeyword("as");
                    stmt = S.Import{
                        .namespace_ref = try p.storeNameInRef(p.lexer.identifier),
                        .star_name_loc = p.lexer.loc(),
                        .import_record_index = std.math.maxInt(u32),
                    };
                    try p.lexer.expect(.t_identifier);
                    try p.lexer.expectContextualKeyword("from");
                },
                .t_open_brace => {
                    // "import {item1, item2} from 'path'"
                    if (!opts.is_module_scope and (!opts.is_namespace_scope or !opts.is_typescript_declare)) {
                        try p.lexer.unexpected();
                        return error.SyntaxError;
                    }
                    const importClause = try p.parseImportClause();
                    if (comptime is_typescript_enabled) {
                        if (importClause.had_type_only_imports and importClause.items.len == 0) {
                            try p.lexer.expectContextualKeyword("from");
                            _ = try p.parsePath();
                            try p.lexer.expectOrInsertSemicolon();
                            return p.s(S.TypeScript{}, loc);
                        }
                    }

                    stmt = S.Import{
                        .namespace_ref = Ref.None,
                        .import_record_index = std.math.maxInt(u32),
                        .items = importClause.items,
                        .is_single_line = importClause.is_single_line,
                    };
                    try p.lexer.expectContextualKeyword("from");
                },
                .t_identifier => {
                    // "import defaultItem from 'path'"
                    // "import foo = bar"
                    if (!opts.is_module_scope and (!opts.is_namespace_scope)) {
                        try p.lexer.unexpected();
                        return error.SyntaxError;
                    }

                    var default_name = p.lexer.identifier;
                    stmt = S.Import{ .namespace_ref = Ref.None, .import_record_index = std.math.maxInt(u32), .default_name = LocRef{
                        .loc = p.lexer.loc(),
                        .ref = try p.storeNameInRef(default_name),
                    } };
                    try p.lexer.next();

                    if (comptime is_typescript_enabled) {
                        // Skip over type-only imports
                        if (strings.eqlComptime(default_name, "type")) {
                            switch (p.lexer.token) {
                                .t_identifier => {
                                    if (!strings.eqlComptime(p.lexer.identifier, "from")) {
                                        default_name = p.lexer.identifier;
                                        stmt.default_name.?.loc = p.lexer.loc();
                                        try p.lexer.next();

                                        if (p.lexer.token == .t_equals) {
                                            // "import type foo = require('bar');"
                                            // "import type foo = bar.baz;"
                                            opts.is_typescript_declare = true;
                                            return try p.parseTypeScriptImportEqualsStmt(loc, opts, stmt.default_name.?.loc, default_name);
                                        } else {
                                            // "import type foo from 'bar';"
                                            try p.lexer.expectContextualKeyword("from");
                                            _ = try p.parsePath();
                                            try p.lexer.expectOrInsertSemicolon();
                                            return p.s(S.TypeScript{}, loc);
                                        }
                                    }
                                },
                                .t_asterisk => {
                                    // "import type * as foo from 'bar';"
                                    try p.lexer.next();
                                    try p.lexer.expectContextualKeyword("as");
                                    try p.lexer.expect(.t_identifier);
                                    try p.lexer.expectContextualKeyword("from");
                                    _ = try p.parsePath();
                                    try p.lexer.expectOrInsertSemicolon();
                                    return p.s(S.TypeScript{}, loc);
                                },

                                .t_open_brace => {
                                    // "import type {foo} from 'bar';"
                                    _ = try p.parseImportClause();
                                    try p.lexer.expectContextualKeyword("from");
                                    _ = try p.parsePath();
                                    try p.lexer.expectOrInsertSemicolon();
                                    return p.s(S.TypeScript{}, loc);
                                },
                                else => {},
                            }
                        }

                        // Parse TypeScript import assignment statements
                        if (p.lexer.token == .t_equals or opts.is_export or (opts.is_namespace_scope and !opts.is_typescript_declare)) {
                            p.esm_import_keyword = previous_import_keyword; // This wasn't an ESM import statement after all;
                            return p.parseTypeScriptImportEqualsStmt(loc, opts, logger.Loc.Empty, default_name);
                        }
                    }

                    if (p.lexer.token == .t_comma) {
                        try p.lexer.next();

                        switch (p.lexer.token) {
                            // "import defaultItem, * as ns from 'path'"
                            .t_asterisk => {
                                try p.lexer.next();
                                try p.lexer.expectContextualKeyword("as");
                                stmt.namespace_ref = try p.storeNameInRef(p.lexer.identifier);
                                stmt.star_name_loc = p.lexer.loc();
                                try p.lexer.expect(.t_identifier);
                            },
                            // "import defaultItem, {item1, item2} from 'path'"
                            .t_open_brace => {
                                const importClause = try p.parseImportClause();

                                stmt.items = importClause.items;
                                stmt.is_single_line = importClause.is_single_line;
                            },
                            else => {
                                try p.lexer.unexpected();
                                return error.SyntaxError;
                            },
                        }
                    }

                    try p.lexer.expectContextualKeyword("from");
                },
                else => {
                    try p.lexer.unexpected();
                    return error.SyntaxError;
                },
            }

            const path = try p.parsePath();
            try p.lexer.expectOrInsertSemicolon();

            return try p.processImportStatement(stmt, path, loc, was_originally_bare_import);
        }
        fn t_break(p: *P, _: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            try p.lexer.next();
            const name = try p.parseLabelName();
            try p.lexer.expectOrInsertSemicolon();
            return p.s(S.Break{ .label = name }, loc);
        }
        fn t_continue(p: *P, _: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            try p.lexer.next();
            const name = try p.parseLabelName();
            try p.lexer.expectOrInsertSemicolon();
            return p.s(S.Continue{ .label = name }, loc);
        }
        fn t_return(p: *P, _: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            if (p.fn_or_arrow_data_parse.is_return_disallowed) {
                try p.log.addRangeError(p.source, p.lexer.range(), "A return statement cannot be used here");
            }
            try p.lexer.next();
            var value: ?Expr = null;
            if ((p.lexer.token != .t_semicolon and
                !p.lexer.has_newline_before and
                p.lexer.token != .t_close_brace and
                p.lexer.token != .t_end_of_file))
            {
                value = try p.parseExpr(.lowest);
            }
            p.latest_return_had_semicolon = p.lexer.token == .t_semicolon;
            try p.lexer.expectOrInsertSemicolon();

            return p.s(S.Return{ .value = value }, loc);
        }
        fn t_throw(p: *P, _: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            try p.lexer.next();
            if (p.lexer.has_newline_before) {
                try p.log.addError(p.source, logger.Loc{
                    .start = loc.start + 5,
                }, "Unexpected newline after \"throw\"");
                return error.SyntaxError;
            }
            const expr = try p.parseExpr(.lowest);
            try p.lexer.expectOrInsertSemicolon();
            return p.s(S.Throw{ .value = expr }, loc);
        }
        fn t_debugger(p: *P, _: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            try p.lexer.next();
            try p.lexer.expectOrInsertSemicolon();
            return p.s(S.Debugger{}, loc);
        }
        fn t_open_brace(p: *P, _: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            _ = try p.pushScopeForParsePass(.block, loc);
            defer p.popScope();
            try p.lexer.next();
            var stmtOpts = ParseStatementOptions{};
            const stmts = try p.parseStmtsUpTo(.t_close_brace, &stmtOpts);
            const close_brace_loc = p.lexer.loc();
            try p.lexer.next();
            return p.s(S.Block{
                .stmts = stmts,
                .close_brace_loc = close_brace_loc,
            }, loc);
        }

        // Parabun: parse a `memo <name>(...) { ... }` statement (sync) or
        // `memo async <name>(...) { ... }` statement. `memo` is a standalone
        // declarator — it implies both purity and function-ness, so no `pure`
        // or `function` keywords. At entry, p.lexer is positioned on the token
        // immediately after `memo` (either `async` or the function name).
        //
        // Desugar:
        //   memo fib(n) { ...body... }
        // becomes:
        //   const fib = __parabunMemo(function(n) { ...body... }, 1);
        //
        // The inner function is rendered anonymous (func.name = null) so that
        // recursive references to `fib` inside the body resolve to the outer
        // `const fib`, which is the memoized wrapper — otherwise a named function
        // expression would bind `fib` inside its own scope and bypass memoization.
        //
        // Arity passed to the runtime helper controls cache layout:
        //   0 args, no rest  → 0 (singleton cache)
        //   1 arg, no rest   → 1 (direct Map)
        //   otherwise        → 2 (nested Maps — also handles rest args correctly)
        /// Peek-only check: does what follows the already-consumed `memo` keyword
        /// look like a statement-form declaration (`memo name(` / `memo async name(` /
        /// `memo name<` / legacy `memo function` / `memo fun` / `memo pure`)?
        /// If not, the caller should treat `memo` as an expression prefix so
        /// `memo (x) => ...` / `memo x => ...` arrows still parse correctly.
        /// Restores the lexer to its current position on return.
        fn isMemoStmtForm(p: *P) !bool {
            const saved = p.lexer;
            defer p.lexer.restore(&saved);

            if (p.lexer.has_newline_before) return false;

            // Legacy forms route into parseMemoFnStmt for a helpful error.
            if (p.lexer.token == .t_function) return true;
            if (p.lexer.token == .t_identifier and strings.eqlComptime(p.lexer.raw(), "pure")) return true;
            if (p.lexer.token == .t_identifier and strings.eqlComptime(p.lexer.raw(), "fun")) return true;

            // Optional `async` modifier before the name.
            if (p.lexer.token == .t_identifier and strings.eqlComptime(p.lexer.raw(), "async")) {
                try p.lexer.next();
                if (p.lexer.has_newline_before) return false;
                // After async, only stmt form has `name(` / `name<`. `async (` or
                // `async x =>` should fall through to the expression path.
            }

            if (p.lexer.token != .t_identifier) return false;

            // Peek one more token to see if this identifier is followed by `(` or `<`
            // — which means it's a function declaration (stmt) rather than an arrow
            // expression like `memo x => x`.
            try p.lexer.next();
            return p.lexer.token == .t_open_paren or p.lexer.token == .t_less_than;
        }

        fn parseMemoFnStmt(p: *P, opts: *ParseStatementOptions, memo_range: logger.Range) anyerror!Stmt {
            // Reject legacy `memo pure function ...` with a helpful migration hint.
            if (p.lexer.token == .t_identifier and strings.eqlComptime(p.lexer.raw(), "pure")) {
                try p.log.addRangeError(p.source, p.lexer.range(), "`memo` now implies `pure` and drops `function`/`fun` — write `memo name(...)` (or `memo async name(...)`)");
                return error.SyntaxError;
            }
            // Reject `memo function ...` / `memo fun ...` — `function`/`fun` is
            // redundant because `memo` itself introduces a function declaration.
            // Point the diagnostic at the offending keyword (not `memo`) so the
            // editor underlines the token the user actually needs to delete.
            if (p.lexer.token == .t_function or
                (p.lexer.token == .t_identifier and strings.eqlComptime(p.lexer.raw(), "fun")))
            {
                try p.log.addRangeError(p.source, p.lexer.range(), "`memo` introduces a function declaration — drop the `function`/`fun` keyword (write `memo name(...)`)");
                return error.SyntaxError;
            }

            var async_range: ?logger.Range = null;
            if (p.lexer.isContextualKeyword("async")) {
                async_range = p.lexer.range();
                try p.lexer.next();
                if (p.lexer.has_newline_before) {
                    try p.log.addRangeError(p.source, async_range.?, "Unexpected newline after \"async\"");
                    return error.SyntaxError;
                }
            }

            if (p.lexer.token != .t_identifier) {
                try p.log.addRangeError(p.source, memo_range, "`memo` requires a name — anonymous memoized functions aren't supported");
                return error.SyntaxError;
            }

            // Remember whether the declaration is exported; parseFnStmt consults
            // opts.is_export and will bake it into the resulting symbol. We move
            // that onto the S.Local we emit instead, so clear it locally.
            const is_export = opts.is_export;
            opts.is_export = false;
            defer opts.is_export = is_export;

            const fn_stmt = try p.parseFnStmt(memo_range.loc, opts, async_range, true);
            // parseFnStmt may return S.TypeScript for forward declarations — memo on
            // those makes no sense, so reject it.
            if (fn_stmt.data != .s_function) {
                try p.log.addRangeError(p.source, memo_range, "`memo` cannot be applied to a TypeScript forward declaration");
                return error.SyntaxError;
            }

            var func = fn_stmt.data.s_function.func;
            const name_loc_ref = func.name.?;
            const name_ref = name_loc_ref.ref.?;

            // The function was declared as .hoisted_function by parseFnStmt;
            // demote to .constant so later passes treat it as a const binding.
            p.symbols.items[name_ref.innerIndex()].kind = .constant;

            // Strip the inner name so recursive references inside the body
            // resolve to the outer const (the memoized wrapper).
            func.name = null;

            const has_rest = func.flags.contains(.has_rest_arg);
            const arity: f64 = blk: {
                if (has_rest) break :blk 2;
                if (func.args.len == 0) break :blk 0;
                if (func.args.len == 1) break :blk 1;
                break :blk 2;
            };

            // When visit traverses an E.Function, it pushes the function_args
            // scope at the expression's own loc; when it traversed an S.Function,
            // it pushed at func.open_parens_loc. To keep the visit-pass scope
            // order consistent with what the parse pass recorded, emit the
            // E.Function at open_parens_loc.
            const fn_loc = func.open_parens_loc;
            const fn_expr = p.newExpr(E.Function{ .func = func }, fn_loc);

            const memo_args = bun.handleOom(p.allocator.alloc(Expr, 2));
            memo_args[0] = fn_expr;
            memo_args[1] = p.newExpr(E.Number{ .value = arity }, fn_loc);
            const memo_call = p.callRuntime(memo_range.loc, "__parabunMemo", memo_args);

            const decls = bun.handleOom(p.allocator.alloc(G.Decl, 1));
            decls[0] = .{
                .binding = p.b(B.Identifier{ .ref = name_ref }, name_loc_ref.loc),
                .value = memo_call,
            };

            return p.s(S.Local{
                .kind = .k_const,
                .decls = G.Decl.List.fromOwnedSlice(decls),
                .is_export = is_export,
            }, memo_range.loc);
        }

        // Parabun: parse a `defer <expr>;` or `defer await <expr>;` statement.
        // Desugars to an ES2024 `using` / `await using` declaration whose
        // initializer wraps a thunk in a disposable shape:
        //
        //   defer fs.closeSync(fd);
        //     → using __parabun_defer_0$ = __parabunDefer0(() => fs.closeSync(fd));
        //
        //   defer await client.disconnect();
        //     → await using __parabun_defer_0$ = __parabunAsyncDefer0(async () => client.disconnect());
        //
        // Disposal order (LIFO), early-return, throw, loop-per-iteration, and
        // SuppressedError chaining all come for free from `using` semantics.
        //
        // At entry: `defer` has already been consumed; p.lexer is on the token
        // following it.
        fn parseDeferStmt(p: *P, opts: *ParseStatementOptions, defer_range: logger.Range) anyerror!Stmt {
            if (opts.lexical_decl != .allow_all) {
                try p.forbidLexicalDecl(defer_range.loc);
            }

            // Optional `await` for async defer. Requires the enclosing function
            // to allow await expressions — otherwise the synthesized async arrow
            // body couldn't await anyway, so we reject at parse time with a
            // clearer message than "unexpected await" deep inside the arrow.
            const is_async = blk: {
                if (p.lexer.token == .t_identifier and !p.lexer.has_newline_before and
                    strings.eqlComptime(p.lexer.raw(), "await"))
                {
                    if (p.fn_or_arrow_data_parse.allow_await != .allow_expr) {
                        try p.log.addRangeError(p.source, p.lexer.range(), "\"defer await\" can only be used inside an async function");
                        return error.SyntaxError;
                    }
                    try p.lexer.next();
                    break :blk true;
                }
                break :blk false;
            };

            // The synthesized arrow needs the same two scopes a real arrow gets
            // during the parse pass so the visit pass finds them at matching
            // locs. function_args goes at `defer`; function_body uses a
            // synthetic offset inside the `defer` keyword itself so it remains
            // strictly less than any loc the operand's own parsing will push
            // (critical for operands that synthesize their own scopes, like
            // `defer throw EXPR` which is itself an IIFE).
            const arrow_loc = defer_range.loc;
            const body_loc = logger.Loc{ .start = defer_range.loc.start + 1 };
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_args, arrow_loc) catch bun.outOfMemory();
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_body, body_loc) catch bun.outOfMemory();

            // Swap fn_or_arrow_data_parse to match the arrow's async-ness so
            // `await` inside the body is valid only when `defer await` was used.
            // A sync arrow body forbids await even if the outer function is async.
            const old_fn_or_arrow_data = std.mem.toBytes(p.fn_or_arrow_data_parse);
            var arrow_data = p.fn_or_arrow_data_parse;
            arrow_data.allow_await = if (is_async) .allow_expr else .allow_ident;
            // Arrows don't allow yield regardless of enclosing generator.
            arrow_data.allow_yield = .allow_ident;
            p.fn_or_arrow_data_parse = arrow_data;

            const expr = try p.parseExpr(.lowest);

            p.fn_or_arrow_data_parse = std.mem.bytesToValue(@TypeOf(p.fn_or_arrow_data_parse), &old_fn_or_arrow_data);

            p.popScope();
            p.popScope();

            try p.lexer.expectOrInsertSemicolon();

            // Build `() => EXPR` (or `async () => EXPR`) as a single-return arrow.
            const stmts = bun.handleOom(p.allocator.alloc(Stmt, 1));
            stmts[0] = p.s(S.Return{ .value = expr }, body_loc);
            const arrow = p.newExpr(E.Arrow{
                .args = &.{},
                .body = .{ .loc = body_loc, .stmts = stmts },
                .prefer_expr = true,
                .is_async = is_async,
            }, arrow_loc);

            const defer_args = bun.handleOom(p.allocator.alloc(Expr, 1));
            defer_args[0] = arrow;
            const defer_call = if (is_async)
                p.callRuntime(defer_range.loc, "__parabunAsyncDefer0", defer_args)
            else
                p.callRuntime(defer_range.loc, "__parabunDefer0", defer_args);

            // Synthesize a unique binding name. We bump temp_ref_count so names
            // can't collide across multiple defers in the same scope. The symbol
            // is declared in the outer scope (current_scope after the two pops).
            p.temp_ref_count += 1;
            const name = bun.handleOom(std.fmt.allocPrint(p.allocator, "__parabun_defer_{x}$", .{p.temp_ref_count}));
            const binding_ref = try p.declareSymbol(.constant, defer_range.loc, name);

            const decls = bun.handleOom(p.allocator.alloc(G.Decl, 1));
            decls[0] = .{
                .binding = p.b(B.Identifier{ .ref = binding_ref }, defer_range.loc),
                .value = defer_call,
            };

            return p.s(S.Local{
                .kind = if (is_async) .k_await_using else .k_using,
                .decls = G.Decl.List.fromOwnedSlice(decls),
                .is_export = false,
            }, defer_range.loc);
        }

        // Parabun: parse an `arena { ...body... }` block statement. Desugars to
        //   __parabunArena(() => { ...body... });
        // which delegates to bun:arena's `scope` — running the body with JSC
        // GC deferred, then requesting an Eden collection on scope exit.
        // Latency-smoothing, not a bump allocator.
        //
        // The body is a block of statements lifted into an arrow; therefore
        // `return`, `break`, and `continue` inside the body are arrow-local
        // (same semantics as forEach callbacks). This is documented — if the
        // caller needs a value out, assign to an outer-let from inside.
        //
        // At entry: `arena` has already been consumed; p.lexer is on the `{`.
        fn parseArenaStmt(p: *P, arena_range: logger.Range) anyerror!Stmt {
            const arrow_loc = arena_range.loc;
            const body_loc = p.lexer.loc();

            // The synthesized arrow needs function_args and function_body
            // scopes at distinct locs, same shape real arrows get.
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_args, arrow_loc) catch bun.outOfMemory();
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_body, body_loc) catch bun.outOfMemory();

            // Swap fn_or_arrow_data_parse to sync-arrow defaults — await is
            // forbidden inside the arena body (DeferGC is sync-only anyway:
            // microtasks fire after scope releases).
            const old_fn_or_arrow_data = std.mem.toBytes(p.fn_or_arrow_data_parse);
            var arrow_data = p.fn_or_arrow_data_parse;
            arrow_data.allow_await = .allow_ident;
            arrow_data.allow_yield = .allow_ident;
            p.fn_or_arrow_data_parse = arrow_data;

            // Consume `{`, parse statements up to `}`.
            try p.lexer.expect(.t_open_brace);
            var body_opts = ParseStatementOptions{};
            const body_stmts = try p.parseStmtsUpTo(.t_close_brace, &body_opts);
            try p.lexer.expect(.t_close_brace);

            p.fn_or_arrow_data_parse = std.mem.bytesToValue(@TypeOf(p.fn_or_arrow_data_parse), &old_fn_or_arrow_data);

            p.popScope();
            p.popScope();

            const arrow = p.newExpr(E.Arrow{
                .args = &.{},
                .body = .{ .loc = body_loc, .stmts = body_stmts },
                .prefer_expr = false,
                .is_async = false,
            }, arrow_loc);

            // Build `require("bun:arena").scope(arrow)` via the user-typed
            // require identifier shape. During the visit pass the parser's
            // transposeRequire path rewrites the literal require call into
            // an E.RequireString with correct part-level import-record
            // bookkeeping; emitting E.RequireString directly from the parse
            // pass skips that and breaks ESM runtime loads.
            //
            // `require_ref` isn't declared yet during parse — user code also
            // lands identifiers through storeNameInRef, which the visit pass
            // resolves via findSymbol to whatever `require` is bound to.
            const require_ref = p.storeNameInRef("require") catch unreachable;
            const require_args = bun.handleOom(p.allocator.alloc(Expr, 1));
            require_args[0] = p.newExpr(E.String{ .data = "bun:arena" }, arena_range.loc);
            const require_call = p.newExpr(E.Call{
                .target = p.newExpr(E.Identifier{ .ref = require_ref }, arena_range.loc),
                .args = js_ast.ExprNodeList.fromOwnedSlice(require_args),
            }, arena_range.loc);
            const scope_dot = p.newExpr(E.Dot{
                .target = require_call,
                .name = "scope",
                .name_loc = arena_range.loc,
            }, arena_range.loc);
            const arena_args = bun.handleOom(p.allocator.alloc(Expr, 1));
            arena_args[0] = arrow;
            const arena_call = p.newExpr(E.Call{
                .target = scope_dot,
                .args = js_ast.ExprNodeList.fromOwnedSlice(arena_args),
            }, arena_range.loc);

            return p.s(S.SExpr{ .value = arena_call }, arena_range.loc);
        }

        // Parabun: parse a `signal NAME = RHS` declaration. `signal` implies
        // `const` — there's no `signal let`/`const`/`var` form. Each RHS is
        // wrapped in
        //   require("bun:signals").signal(RHS)
        // by default, or
        //   require("bun:signals").derived(() => RHS)
        // when the RHS references another in-scope signal name (auto-derive).
        // The file-level pragma `// @parabun-strict-signals` disables
        // auto-derive, making every decl a plain `signal(RHS)`.
        //
        // Each declared ref is recorded in p.signal_bound_refs so the visit
        // pass rewrites bare reads into `.get()` calls and assignments into
        // `.set(...)` calls. The declared name is also counted in
        // p.signal_bound_names so later decls can auto-derive from it.
        //
        // Only simple identifier bindings are allowed in v1 — destructuring
        // (`signal { a, b } = ...`) reports an error.
        //
        // On entry, the lexer is on the binding name (t_identifier).
        fn parseSignalStmt(p: *P, signal_range: logger.Range, opts: *ParseStatementOptions) anyerror!Stmt {
            if (!p.parabun_strict_signals_scanned) {
                p.parabun_strict_signals_scanned = true;
                p.parabun_strict_signals = strings.contains(p.source.contents, "@parabun-strict-signals");
            }

            // Parse binding list manually so we can push an arrow scope-pair
            // around each RHS — needed because auto-derive wraps the RHS as
            // `() => RHS` and E.Arrow requires scopes that are visible to the
            // visit pass via scopes_in_order. We push the scopes unconditionally
            // and always wrap the RHS in an arrow; for the non-derive case
            // the arrow is immediately invoked (`signal((() => RHS)())`), so
            // the scopes stay consistent either way.
            var decls = ListManaged(G.Decl).init(p.allocator);

            while (true) {
                var local = try p.parseBinding(.{});
                p.declareBinding(.constant, &local, opts) catch unreachable;

                if (comptime is_typescript_enabled) {
                    const is_definite_assignment_assertion = p.lexer.token == .t_exclamation and !p.lexer.has_newline_before;
                    if (is_definite_assignment_assertion) try p.lexer.next();
                    if (is_definite_assignment_assertion or p.lexer.token == .t_colon) {
                        try p.lexer.expect(.t_colon);
                        try p.skipTypeScriptType(.lowest);
                    }
                }

                var value: ?Expr = null;
                if (p.lexer.token == .t_equals) {
                    try p.lexer.next();
                    // Arrow and body need distinct, strictly-increasing locs
                    // so the scopes_in_order assertion holds (and so multiple
                    // decls in one signal stmt don't collide).
                    const arrow_loc = p.lexer.loc();
                    const body_loc = logger.Loc{ .start = arrow_loc.start + 1 };

                    _ = p.pushScopeForParsePass(.function_args, arrow_loc) catch bun.outOfMemory();
                    _ = p.pushScopeForParsePass(.function_body, body_loc) catch bun.outOfMemory();

                    const old_fn_or_arrow_data = std.mem.toBytes(p.fn_or_arrow_data_parse);
                    var arrow_data = p.fn_or_arrow_data_parse;
                    arrow_data.allow_await = .allow_ident;
                    arrow_data.allow_yield = .allow_ident;
                    p.fn_or_arrow_data_parse = arrow_data;

                    const rhs = try p.parseExpr(.comma);

                    p.fn_or_arrow_data_parse = std.mem.bytesToValue(@TypeOf(p.fn_or_arrow_data_parse), &old_fn_or_arrow_data);

                    p.popScope();
                    p.popScope();

                    switch (local.data) {
                        .b_identifier => |id| {
                            bun.handleOom(p.signal_bound_refs.put(p.allocator, id.ref, {}));

                            const name = p.symbols.items[id.ref.innerIndex()].original_name;
                            const should_derive = !p.parabun_strict_signals and rhsHasSignalName(p, rhs);

                            const arrow_stmts = bun.handleOom(p.allocator.alloc(Stmt, 1));
                            arrow_stmts[0] = p.s(S.Return{ .value = rhs }, body_loc);
                            const arrow = p.newExpr(E.Arrow{
                                .args = &.{},
                                .body = .{ .loc = body_loc, .stmts = arrow_stmts },
                                .prefer_expr = true,
                                .is_async = false,
                            }, arrow_loc);

                            const require_ref = p.storeNameInRef("require") catch unreachable;
                            const require_args = bun.handleOom(p.allocator.alloc(Expr, 1));
                            require_args[0] = p.newExpr(E.String{ .data = "bun:signals" }, signal_range.loc);
                            const require_call = p.newExpr(E.Call{
                                .target = p.newExpr(E.Identifier{ .ref = require_ref }, signal_range.loc),
                                .args = js_ast.ExprNodeList.fromOwnedSlice(require_args),
                            }, signal_range.loc);

                            const wrap_name: []const u8 = if (should_derive) "derived" else "signal";
                            const wrap_dot = p.newExpr(E.Dot{
                                .target = require_call,
                                .name = wrap_name,
                                .name_loc = signal_range.loc,
                            }, signal_range.loc);

                            const wrap_arg: Expr = if (should_derive) arrow else blk: {
                                // Non-derive: invoke the arrow immediately so
                                // `signal()` sees a concrete value. The arrow
                                // wrapper exists only to keep scopes_in_order
                                // consistent at parse time.
                                const invoke_args = js_ast.ExprNodeList.empty;
                                break :blk p.newExpr(E.Call{
                                    .target = arrow,
                                    .args = invoke_args,
                                }, arrow_loc);
                            };

                            const wrap_args = bun.handleOom(p.allocator.alloc(Expr, 1));
                            wrap_args[0] = wrap_arg;
                            const wrap_call = p.newExpr(E.Call{
                                .target = wrap_dot,
                                .args = js_ast.ExprNodeList.fromOwnedSlice(wrap_args),
                            }, signal_range.loc);
                            value = wrap_call;

                            const gop = bun.handleOom(p.signal_bound_names.getOrPut(p.allocator, name));
                            if (!gop.found_existing) gop.value_ptr.* = 0;
                            gop.value_ptr.* += 1;
                        },
                        else => {
                            p.log.addRangeError(p.source, signal_range, "\"signal\" declarations must use a simple identifier binding (no destructuring)") catch unreachable;
                            value = rhs;
                        },
                    }
                }

                decls.append(G.Decl{ .binding = local, .value = value }) catch unreachable;

                if (p.lexer.token != .t_comma) break;
                try p.lexer.next();
            }

            try p.lexer.expectOrInsertSemicolon();

            if (!opts.is_typescript_declare) {
                try p.requireInitializers(.k_const, decls.items);
            }

            return p.s(S.Local{
                .kind = .k_const,
                .decls = G.Decl.List.moveFromList(&decls),
                .is_export = opts.is_export,
            }, signal_range.loc);
        }

        // Parabun: best-effort walk of `expr` looking for any `e_identifier`
        // whose name appears in `p.signal_bound_names`. Stops at nested
        // arrows/functions/classes — those introduce new scopes and it's
        // safer to not auto-derive than to over-promote. If detection misses
        // a dep, the user can switch to explicit `derived(() => ...)` or
        // the `@parabun-strict-signals` pragma.
        fn rhsHasSignalName(p: *P, expr: Expr) bool {
            return switch (expr.data) {
                .e_identifier => |id| blk: {
                    const name = p.loadNameFromRef(id.ref);
                    break :blk p.signal_bound_names.contains(name);
                },
                .e_binary => |e| rhsHasSignalName(p, e.left) or rhsHasSignalName(p, e.right),
                .e_unary => |e| rhsHasSignalName(p, e.value),
                .e_call => |e| blk: {
                    if (rhsHasSignalName(p, e.target)) break :blk true;
                    for (e.args.slice()) |arg| {
                        if (rhsHasSignalName(p, arg)) break :blk true;
                    }
                    break :blk false;
                },
                .e_new => |e| blk: {
                    if (rhsHasSignalName(p, e.target)) break :blk true;
                    for (e.args.slice()) |arg| {
                        if (rhsHasSignalName(p, arg)) break :blk true;
                    }
                    break :blk false;
                },
                .e_dot => |e| rhsHasSignalName(p, e.target),
                .e_index => |e| rhsHasSignalName(p, e.target) or rhsHasSignalName(p, e.index),
                .e_if => |e| rhsHasSignalName(p, e.test_) or rhsHasSignalName(p, e.yes) or rhsHasSignalName(p, e.no),
                .e_template => |e| blk: {
                    if (e.tag) |tag| {
                        if (rhsHasSignalName(p, tag)) break :blk true;
                    }
                    for (e.parts) |part| {
                        if (rhsHasSignalName(p, part.value)) break :blk true;
                    }
                    break :blk false;
                },
                .e_array => |e| blk: {
                    for (e.items.slice()) |item| {
                        if (rhsHasSignalName(p, item)) break :blk true;
                    }
                    break :blk false;
                },
                .e_object => |e| blk: {
                    for (e.properties.slice()) |prop| {
                        if (prop.key) |k| if (rhsHasSignalName(p, k)) break :blk true;
                        if (prop.value) |v| if (rhsHasSignalName(p, v)) break :blk true;
                        if (prop.initializer) |init| if (rhsHasSignalName(p, init)) break :blk true;
                    }
                    break :blk false;
                },
                .e_spread => |e| rhsHasSignalName(p, e.value),
                .e_await => |e| rhsHasSignalName(p, e.value),
                .e_yield => |e| if (e.value) |v| rhsHasSignalName(p, v) else false,
                // Opaque: nested scopes (arrow, function, class) — don't peek
                // inside. Primitives (string/number/bool/etc) — no names.
                else => false,
            };
        }

        // Parabun: parse an `effect { ...body... }` block statement. Desugars to
        //   require("bun:signals").effect(() => { ...body... });
        // The runtime wraps the arrow in an EffectImpl which runs once eagerly,
        // tracks any signal `.get()` reads as deps, and re-runs on invalidation.
        // Return a function from the body for cleanup (React-style); it fires
        // before the next run and on dispose.
        //
        // The body is lifted into an arrow, so `return`/`break`/`continue`
        // inside the body are arrow-local. Await is forbidden — effects are
        // synchronous (the flush loop assumes so).
        //
        // At entry: `effect` has already been consumed; p.lexer is on the `{`.
        fn parseEffectStmt(p: *P, effect_range: logger.Range) anyerror!Stmt {
            const arrow_loc = effect_range.loc;
            const body_loc = p.lexer.loc();

            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_args, arrow_loc) catch bun.outOfMemory();
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_body, body_loc) catch bun.outOfMemory();

            const old_fn_or_arrow_data = std.mem.toBytes(p.fn_or_arrow_data_parse);
            var arrow_data = p.fn_or_arrow_data_parse;
            arrow_data.allow_await = .allow_ident;
            arrow_data.allow_yield = .allow_ident;
            p.fn_or_arrow_data_parse = arrow_data;

            try p.lexer.expect(.t_open_brace);
            var body_opts = ParseStatementOptions{};
            const body_stmts = try p.parseStmtsUpTo(.t_close_brace, &body_opts);
            try p.lexer.expect(.t_close_brace);

            p.fn_or_arrow_data_parse = std.mem.bytesToValue(@TypeOf(p.fn_or_arrow_data_parse), &old_fn_or_arrow_data);

            p.popScope();
            p.popScope();

            const arrow = p.newExpr(E.Arrow{
                .args = &.{},
                .body = .{ .loc = body_loc, .stmts = body_stmts },
                .prefer_expr = false,
                .is_async = false,
            }, arrow_loc);

            const require_ref = p.storeNameInRef("require") catch unreachable;
            const require_args = bun.handleOom(p.allocator.alloc(Expr, 1));
            require_args[0] = p.newExpr(E.String{ .data = "bun:signals" }, effect_range.loc);
            const require_call = p.newExpr(E.Call{
                .target = p.newExpr(E.Identifier{ .ref = require_ref }, effect_range.loc),
                .args = js_ast.ExprNodeList.fromOwnedSlice(require_args),
            }, effect_range.loc);
            const effect_dot = p.newExpr(E.Dot{
                .target = require_call,
                .name = "effect",
                .name_loc = effect_range.loc,
            }, effect_range.loc);
            const effect_args = bun.handleOom(p.allocator.alloc(Expr, 1));
            effect_args[0] = arrow;
            const effect_call = p.newExpr(E.Call{
                .target = effect_dot,
                .args = js_ast.ExprNodeList.fromOwnedSlice(effect_args),
            }, effect_range.loc);

            return p.s(S.SExpr{ .value = effect_call }, effect_range.loc);
        }

        fn parseStmtFallthrough(p: *P, opts: *ParseStatementOptions, loc: logger.Loc) anyerror!Stmt {
            const is_identifier = p.lexer.token == .t_identifier;
            const name = p.lexer.identifier;
            // Parse either a pure function, an async function, an async expression, or a normal expression
            var expr: Expr = Expr{ .loc = loc, .data = Expr.Data{ .e_missing = .{} } };
            // Parabun: "memo name(...)" / "memo async name(...)" statements —
            // desugars to `const <name> = __parabunMemo(<anonymous fn>, <arity>);`.
            // `memo` alone is a memoized-function declarator; it implies purity
            // and function-ness (no `pure` / `function` / `fun` keyword).
            if (is_identifier and strings.eqlComptime(p.lexer.raw(), "memo")) {
                const memo_range = p.lexer.range();
                // Tentatively consume `memo`; if what follows doesn't look like
                // a statement-form declaration, restore and treat as expression
                // (the prefix parser handles `memo (x) => ...` arrow form).
                const saved = p.lexer;
                try p.lexer.next();
                if (!p.lexer.has_newline_before and try isMemoStmtForm(p)) {
                    return try parseMemoFnStmt(p, opts, memo_range);
                }
                p.lexer.restore(&saved);
            }
            // Parabun: "defer <expr>;" / "defer await <expr>;" statements —
            // desugars to `using __parabun_defer_N$ = __parabunDefer0(() => <expr>);`.
            // Only triggers when `defer` is immediately followed (no newline) by a
            // non-operator token that could start an expression — if the next
            // token is `=`, `.`, `;`, etc., `defer` is a plain identifier.
            if (is_identifier and strings.eqlComptime(p.lexer.raw(), "defer")) {
                const defer_range = p.lexer.range();
                const saved = p.lexer;
                try p.lexer.next();
                // Heuristic: if the token after `defer` starts a statement-level
                // expression (no newline, not a punctuator that'd bind `defer`
                // as a normal identifier), treat this as a defer declaration.
                // An identifier, keyword-expr (`await`, `new`, `function`,
                // `throw`, `class`, `this`), literal, prefix op, or open paren /
                // bracket all qualify.
                if (!p.lexer.has_newline_before) {
                    const t = p.lexer.token;
                    const starts_expr = switch (t) {
                        .t_identifier,
                        .t_open_paren,
                        .t_open_bracket,
                        .t_open_brace,
                        .t_new,
                        .t_function,
                        .t_throw,
                        .t_class,
                        .t_this,
                        .t_null,
                        .t_true,
                        .t_false,
                        .t_void,
                        .t_typeof,
                        .t_delete,
                        .t_plus,
                        .t_minus,
                        .t_tilde,
                        .t_exclamation,
                        .t_plus_plus,
                        .t_minus_minus,
                        .t_numeric_literal,
                        .t_big_integer_literal,
                        .t_string_literal,
                        .t_no_substitution_template_literal,
                        .t_template_head,
                        .t_super,
                        .t_import,
                        => true,
                        else => false,
                    };
                    if (starts_expr) {
                        return try parseDeferStmt(p, opts, defer_range);
                    }
                }
                // Not a defer declaration — rewind and fall through so `defer`
                // works as a plain identifier (`const defer = 1; defer + 1;`).
                p.lexer.restore(&saved);
            }
            // Parabun: "arena { ...body... }" block statement — desugars to
            //   __parabunArena(() => { ...body... });
            // Only triggers when `arena` is immediately followed (no newline) by
            // `{`. Any other token (`.`, `(`, `=`, `++`, etc.) means `arena` is
            // a plain identifier.
            if (is_identifier and strings.eqlComptime(p.lexer.raw(), "arena")) {
                const arena_range = p.lexer.range();
                const saved = p.lexer;
                try p.lexer.next();
                if (!p.lexer.has_newline_before and p.lexer.token == .t_open_brace) {
                    return try parseArenaStmt(p, arena_range);
                }
                // Not an arena block — rewind so `arena` works as a plain
                // identifier (`const arena = 1; arena + 1;`).
                p.lexer.restore(&saved);
            }
            // Parabun: "signal NAME = RHS" declaration — each RHS is wrapped
            // in `require("bun:signals").signal(RHS)` and the declared ref is
            // marked as signal-bound so the visit pass rewrites reads/assigns
            // accordingly. `signal` implies `const` — there's no `signal let`
            // or `signal var`.
            //
            // Only triggers when `signal` is immediately followed (no newline)
            // by an identifier. Any other continuation leaves `signal` as a
            // plain identifier.
            if (is_identifier and strings.eqlComptime(p.lexer.raw(), "signal")) {
                const signal_range = p.lexer.range();
                const saved = p.lexer;
                try p.lexer.next();
                if (!p.lexer.has_newline_before and p.lexer.token == .t_identifier) {
                    return try parseSignalStmt(p, signal_range, opts);
                }
                // Not a signal declaration — rewind so `signal` works as a
                // plain identifier (`import { signal } from "bun:signals"; signal(0);`).
                p.lexer.restore(&saved);
            }
            // Parabun: "effect { ...body... }" block statement — desugars to
            //   require("bun:signals").effect(() => { ...body... });
            // Only triggers when `effect` is immediately followed (no newline)
            // by `{`. Any other token means `effect` is a plain identifier
            // (including `effect(fn)` — that's a regular call expression).
            if (is_identifier and strings.eqlComptime(p.lexer.raw(), "effect")) {
                const effect_range = p.lexer.range();
                const saved = p.lexer;
                try p.lexer.next();
                if (!p.lexer.has_newline_before and p.lexer.token == .t_open_brace) {
                    return try parseEffectStmt(p, effect_range);
                }
                // Not an effect block — rewind so `effect` works as a plain
                // identifier (`import { effect } from "bun:signals"; effect(fn);`).
                p.lexer.restore(&saved);
            }
            // Parabun: "pure function" or "pure async function" statements
            if (is_identifier and strings.eqlComptime(p.lexer.raw(), "pure")) {
                const pure_range = p.lexer.range();
                try p.lexer.next();

                if (p.lexer.token == .t_function and !p.lexer.has_newline_before) {
                    // "pure function foo() {}"
                    try p.lexer.next();
                    return try p.parseFnStmt(pure_range.loc, opts, null, true);
                }

                if (!p.lexer.has_newline_before and p.lexer.isContextualKeyword("async")) {
                    const async_range = p.lexer.range();
                    try p.lexer.next();
                    if (p.lexer.token == .t_function and !p.lexer.has_newline_before) {
                        // "pure async function foo() {}"
                        try p.lexer.next();
                        return try p.parseFnStmt(pure_range.loc, opts, async_range, true);
                    }
                    // "pure async () => {}" — expression statement
                    expr = try p.parsePureAsyncPrefixExpr(pure_range, async_range, .lowest);
                    try p.parseSuffix(&expr, .lowest, null, Expr.EFlags.none);
                } else {
                    // "pure () => x" or "pure x => x" — expression statement
                    expr = try p.parsePurePrefixExpr(pure_range, .lowest);
                    try p.parseSuffix(&expr, .lowest, null, Expr.EFlags.none);
                }
            } else if (is_identifier and strings.eqlComptime(p.lexer.raw(), "async")) {
                const async_range = p.lexer.range();
                try p.lexer.next();
                if (p.lexer.token == .t_function and !p.lexer.has_newline_before) {
                    try p.lexer.next();

                    return try p.parseFnStmt(async_range.loc, opts, async_range, false);
                }

                expr = try p.parseAsyncPrefixExpr(async_range, .lowest);
                try p.parseSuffix(&expr, .lowest, null, Expr.EFlags.none);
            } else {
                const exprOrLet = try p.parseExprOrLetStmt(opts);
                switch (exprOrLet.stmt_or_expr) {
                    .stmt => |stmt| {
                        try p.lexer.expectOrInsertSemicolon();
                        return stmt;
                    },
                    .expr => |_expr| {
                        expr = _expr;
                    },
                }
            }
            if (is_identifier) {
                switch (expr.data) {
                    .e_identifier => |ident| {
                        if (p.lexer.token == .t_colon and !opts.hasDecorators()) {
                            _ = try p.pushScopeForParsePass(.label, loc);
                            defer p.popScope();

                            // Parse a labeled statement
                            try p.lexer.next();

                            const _name = LocRef{ .loc = expr.loc, .ref = ident.ref };
                            var nestedOpts = ParseStatementOptions{};

                            switch (opts.lexical_decl) {
                                .allow_all, .allow_fn_inside_label => {
                                    nestedOpts.lexical_decl = .allow_fn_inside_label;
                                },
                                else => {},
                            }
                            const stmt = try p.parseStmt(&nestedOpts);
                            return p.s(S.Label{ .name = _name, .stmt = stmt }, loc);
                        }
                    },
                    else => {},
                }

                if (is_typescript_enabled) {
                    if (js_lexer.TypescriptStmtKeyword.List.get(name)) |ts_stmt| {
                        switch (ts_stmt) {
                            .ts_stmt_type => {
                                if (p.lexer.token == .t_identifier and !p.lexer.has_newline_before) {
                                    // "type Foo = any"
                                    var stmtOpts = ParseStatementOptions{ .is_module_scope = opts.is_module_scope };
                                    try p.skipTypeScriptTypeStmt(&stmtOpts);
                                    return p.s(S.TypeScript{}, loc);
                                }
                            },
                            .ts_stmt_namespace, .ts_stmt_module => {
                                // "namespace Foo {}"
                                // "module Foo {}"
                                // "declare module 'fs' {}"
                                // "declare module 'fs';"
                                if (!p.lexer.has_newline_before and
                                    (opts.is_module_scope or opts.is_namespace_scope) and
                                    (p.lexer.token == .t_identifier or (p.lexer.token == .t_string_literal and opts.is_typescript_declare)))
                                {
                                    return p.parseTypeScriptNamespaceStmt(loc, opts);
                                }
                            },
                            .ts_stmt_interface => {
                                // "interface Foo {}"
                                var stmtOpts = ParseStatementOptions{ .is_module_scope = opts.is_module_scope };

                                try p.skipTypeScriptInterfaceStmt(&stmtOpts);
                                return p.s(S.TypeScript{}, loc);
                            },
                            .ts_stmt_abstract => {
                                if (p.lexer.token == .t_class or opts.ts_decorators != null) {
                                    return try p.parseClassStmt(loc, opts);
                                }
                            },
                            .ts_stmt_global => {
                                // "declare module 'fs' { global { namespace NodeJS {} } }"
                                if (opts.is_namespace_scope and opts.is_typescript_declare and p.lexer.token == .t_open_brace) {
                                    try p.lexer.next();
                                    _ = try p.parseStmtsUpTo(.t_close_brace, opts);
                                    try p.lexer.next();
                                    return p.s(S.TypeScript{}, loc);
                                }
                            },
                            .ts_stmt_declare => {
                                opts.lexical_decl = .allow_all;
                                opts.is_typescript_declare = true;

                                // "@decorator declare class Foo {}"
                                // "@decorator declare abstract class Foo {}"
                                if (opts.ts_decorators != null and p.lexer.token != .t_class and !p.lexer.isContextualKeyword("abstract")) {
                                    try p.lexer.expected(.t_class);
                                }

                                // "declare global { ... }"
                                if (p.lexer.isContextualKeyword("global")) {
                                    try p.lexer.next();
                                    try p.lexer.expect(.t_open_brace);
                                    _ = try p.parseStmtsUpTo(.t_close_brace, opts);
                                    try p.lexer.next();
                                    return p.s(S.TypeScript{}, loc);
                                }

                                // "declare const x: any"
                                const stmt = try p.parseStmt(opts);
                                if (opts.ts_decorators) |decs| {
                                    p.discardScopesUpTo(decs.scope_index);
                                }

                                // Unlike almost all uses of "declare", statements that use
                                // "export declare" with "var/let/const" inside a namespace affect
                                // code generation. They cause any declared bindings to be
                                // considered exports of the namespace. Identifier references to
                                // those names must be converted into property accesses off the
                                // namespace object:
                                //
                                //   namespace ns {
                                //     export declare const x
                                //     export function y() { return x }
                                //   }
                                //
                                //   (ns as any).x = 1
                                //   console.log(ns.y())
                                //
                                // In this example, "return x" must be replaced with "return ns.x".
                                // This is handled by replacing each "export declare" statement
                                // inside a namespace with an "export var" statement containing all
                                // of the declared bindings. That "export var" statement will later
                                // cause identifiers to be transformed into property accesses.
                                if (opts.is_namespace_scope and opts.is_export) {
                                    var decls: G.Decl.List = .{};
                                    switch (stmt.data) {
                                        .s_local => |local| {
                                            var _decls = try ListManaged(G.Decl).initCapacity(p.allocator, local.decls.len);
                                            for (local.decls.slice()) |decl| {
                                                try extractDeclsForBinding(decl.binding, &_decls);
                                            }
                                            decls = .moveFromList(&_decls);
                                        },
                                        else => {},
                                    }

                                    if (decls.len > 0) {
                                        return p.s(S.Local{
                                            .kind = .k_var,
                                            .is_export = true,
                                            .decls = decls,
                                        }, loc);
                                    }
                                }

                                return p.s(S.TypeScript{}, loc);
                            },
                        }
                    }
                }
            }
            // Output.print("\n\nmVALUE {s}:{s}\n", .{ expr, name });
            try p.lexer.expectOrInsertSemicolon();
            return p.s(S.SExpr{ .value = expr }, loc);
        }

        pub fn parseStmt(p: *P, opts: *ParseStatementOptions) anyerror!Stmt {
            if (!p.stack_check.isSafeToRecurse()) {
                try bun.throwStackOverflow();
            }

            return switch (p.lexer.token) {
                .t_semicolon => t_semicolon(p),
                .t_at => t_at(p, opts),

                inline .t_export,
                .t_function,
                .t_enum,
                .t_class,
                .t_var,
                .t_const,
                .t_if,
                .t_do,
                .t_while,
                .t_with,
                .t_switch,
                .t_try,
                .t_for,
                .t_import,
                .t_break,
                .t_continue,
                .t_return,
                .t_throw,
                .t_debugger,
                .t_open_brace,
                => |function| @field(@This(), @tagName(function))(p, opts, p.lexer.loc()),

                else => parseStmtFallthrough(p, opts, p.lexer.loc()),
            };
        }
    };
}

const bun = @import("bun");
const Output = bun.Output;
const logger = bun.logger;
const strings = bun.strings;

const js_ast = bun.ast;
const B = js_ast.B;
const Binding = js_ast.Binding;
const E = js_ast.E;
const Expr = js_ast.Expr;
const LocRef = js_ast.LocRef;
const S = js_ast.S;
const Stmt = js_ast.Stmt;
const Symbol = js_ast.Symbol;

const G = js_ast.G;
const Decl = G.Decl;

const Op = js_ast.Op;
const Level = js_ast.Op.Level;

const js_lexer = bun.js_lexer;
const T = js_lexer.T;

const js_parser = bun.js_parser;
const DeferredTsDecorators = js_parser.DeferredTsDecorators;
const ImportKind = js_parser.ImportKind;
const JSXTransformType = js_parser.JSXTransformType;
const ParseStatementOptions = js_parser.ParseStatementOptions;
const ParsedPath = js_parser.ParsedPath;
const Ref = js_parser.Ref;
const StmtList = js_parser.StmtList;
const TypeScript = js_parser.TypeScript;
const fs = js_parser.fs;

const std = @import("std");
const List = std.ArrayListUnmanaged;
const ListManaged = std.array_list.Managed;
