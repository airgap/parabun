pub fn Parse(
    comptime parser_feature__typescript: bool,
    comptime parser_feature__jsx: JSXTransformType,
    comptime parser_feature__scan_only: bool,
) type {
    return struct {
        const P = js_parser.NewParser_(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only);
        const is_jsx_enabled = P.is_jsx_enabled;
        const is_typescript_enabled = P.is_typescript_enabled;

        pub const parsePrefix = @import("./parsePrefix.zig").ParsePrefix(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parsePrefix;
        pub const parseSuffix = @import("./parseSuffix.zig").ParseSuffix(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseSuffix;
        // Parabun: bare-dot lambda sugar — exposed so parseCallArgs can
        // synthesize `(__pcv) => __pcv.<chain>` when an argument starts
        // with `.`. Same machinery used by chain-op handlers.
        pub const parseLeadingDotLambda = @import("./parseSuffix.zig").ParseSuffix(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseLeadingDotChainHandler;
        pub const parseStmt = @import("./parseStmt.zig").ParseStmt(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseStmt;
        pub const parseProperty = @import("./parseProperty.zig").ParseProperty(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseProperty;
        pub const parseFn = @import("./parseFn.zig").ParseFn(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseFn;
        pub const parseFnStmt = @import("./parseFn.zig").ParseFn(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseFnStmt;
        pub const parseFnExpr = @import("./parseFn.zig").ParseFn(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseFnExpr;
        pub const parseFnBody = @import("./parseFn.zig").ParseFn(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseFnBody;
        pub const parseArrowBody = @import("./parseFn.zig").ParseFn(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseArrowBody;
        pub const parseJSXElement = @import("./parseJSXElement.zig").ParseJSXElement(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseJSXElement;
        pub const parseImportExpr = @import("./parseImportExport.zig").ParseImportExport(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseImportExpr;
        pub const parseImportClause = @import("./parseImportExport.zig").ParseImportExport(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseImportClause;
        pub const parseExportClause = @import("./parseImportExport.zig").ParseImportExport(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseExportClause;
        pub const parseTypeScriptDecorators = @import("./parseTypescript.zig").ParseTypescript(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseTypeScriptDecorators;
        pub const parseStandardDecorator = @import("./parseTypescript.zig").ParseTypescript(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseStandardDecorator;
        pub const parseTypeScriptNamespaceStmt = @import("./parseTypescript.zig").ParseTypescript(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseTypeScriptNamespaceStmt;
        pub const parseTypeScriptImportEqualsStmt = @import("./parseTypescript.zig").ParseTypescript(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseTypeScriptImportEqualsStmt;
        pub const parseTypescriptEnumStmt = @import("./parseTypescript.zig").ParseTypescript(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only).parseTypescriptEnumStmt;

        pub inline fn parseExprOrBindings(p: *P, level: Level, errors: ?*DeferredErrors, expr: *Expr) anyerror!void {
            return p.parseExprCommon(level, errors, Expr.EFlags.none, expr);
        }

        pub inline fn parseExpr(p: *P, level: Level) anyerror!Expr {
            var expr: Expr = undefined;
            try p.parseExprCommon(level, null, Expr.EFlags.none, &expr);
            return expr;
        }

        pub inline fn parseExprWithFlags(p: *P, level: Level, flags: Expr.EFlags, expr: *Expr) anyerror!void {
            return p.parseExprCommon(level, null, flags, expr);
        }

        pub fn parseExprCommon(p: *P, level: Level, errors: ?*DeferredErrors, flags: Expr.EFlags, expr: *Expr) anyerror!void {
            if (!p.stack_check.isSafeToRecurse()) {
                try bun.throwStackOverflow();
            }

            const had_pure_comment_before = p.lexer.has_pure_comment_before and !p.options.ignore_dce_annotations;
            expr.* = try p.parsePrefix(level, errors, flags);

            // There is no formal spec for "__PURE__" comments but from reverse-
            // engineering, it looks like they apply to the next CallExpression or
            // NewExpression. So in "/* @__PURE__ */ a().b() + c()" the comment applies
            // to the expression "a().b()".

            if (had_pure_comment_before and level.lt(.call)) {
                try p.parseSuffix(expr, @as(Level, @enumFromInt(@intFromEnum(Level.call) - 1)), errors, flags);
                switch (expr.data) {
                    .e_call => |ex| {
                        ex.can_be_unwrapped_if_unused = .if_unused;
                    },
                    .e_new => |ex| {
                        ex.can_be_unwrapped_if_unused = .if_unused;
                    },
                    else => {},
                }
            }

            try p.parseSuffix(expr, level, errors, flags);
        }

        pub fn parseYieldExpr(p: *P, loc: logger.Loc) !ExprNodeIndex {
            // Parse a yield-from expression, which yields from an iterator
            const isStar = p.lexer.token == T.t_asterisk;

            if (isStar) {
                if (p.lexer.has_newline_before) {
                    try p.lexer.unexpected();
                    return error.SyntaxError;
                }
                try p.lexer.next();
            }

            var value: ?ExprNodeIndex = null;
            switch (p.lexer.token) {
                .t_close_brace, .t_close_paren, .t_close_bracket, .t_colon, .t_comma, .t_semicolon => {},
                else => {
                    if (isStar or !p.lexer.has_newline_before) {
                        value = try p.parseExpr(.yield);
                    }
                },
            }

            return p.newExpr(E.Yield{
                .value = value,
                .is_star = isStar,
            }, loc);
        }

        // By the time we call this, the identifier and type parameters have already
        // been parsed. We need to start parsing from the "extends" clause.
        pub fn parseClass(p: *P, class_keyword: logger.Range, name: ?js_ast.LocRef, class_opts: ParseClassOptions) !G.Class {
            var extends: ?Expr = null;
            var has_decorators: bool = false;
            var has_auto_accessor: bool = false;

            if (p.lexer.token == .t_extends) {
                try p.lexer.next();
                extends = try p.parseExpr(.new);

                // TypeScript's type argument parser inside expressions backtracks if the
                // first token after the end of the type parameter list is "{", so the
                // parsed expression above will have backtracked if there are any type
                // arguments. This means we have to re-parse for any type arguments here.
                // This seems kind of wasteful to me but it's what the official compiler
                // does and it probably doesn't have that high of a performance overhead
                // because "extends" clauses aren't that frequent, so it should be ok.
                if (comptime is_typescript_enabled) {
                    _ = try p.skipTypeScriptTypeArguments(false); // isInsideJSXElement
                }
            }

            if (comptime is_typescript_enabled) {
                if (p.lexer.isContextualKeyword("implements")) {
                    try p.lexer.next();

                    while (true) {
                        try p.skipTypeScriptType(.lowest);
                        if (p.lexer.token != .t_comma) {
                            break;
                        }
                        try p.lexer.next();
                    }
                }
            }

            const body_loc = p.lexer.loc();
            try p.lexer.expect(T.t_open_brace);
            var properties = ListManaged(G.Property).init(p.allocator);

            // Allow "in" and private fields inside class bodies
            const old_allow_in = p.allow_in;
            const old_allow_private_identifiers = p.allow_private_identifiers;
            p.allow_in = true;
            p.allow_private_identifiers = true;

            // A scope is needed for private identifiers
            const scopeIndex = p.pushScopeForParsePass(.class_body, body_loc) catch unreachable;

            var opts = PropertyOpts{ .is_class = true, .allow_ts_decorators = class_opts.allow_ts_decorators, .class_has_extends = extends != null };
            while (!p.lexer.token.isCloseBraceOrEOF()) {
                if (p.lexer.token == .t_semicolon) {
                    try p.lexer.next();
                    continue;
                }

                opts = PropertyOpts{ .is_class = true, .allow_ts_decorators = class_opts.allow_ts_decorators, .class_has_extends = extends != null, .has_argument_decorators = false };

                // Parse decorators for this property
                const first_decorator_loc = p.lexer.loc();
                if (opts.allow_ts_decorators) {
                    opts.ts_decorators = try p.parseTypeScriptDecorators();
                    opts.has_class_decorators = class_opts.ts_decorators.len > 0;
                    has_decorators = has_decorators or opts.ts_decorators.len > 0;
                } else {
                    opts.ts_decorators = &[_]Expr{};
                }

                // This property may turn out to be a type in TypeScript, which should be ignored
                if (try p.parseProperty(.normal, &opts, null)) |property| {
                    properties.append(property) catch unreachable;
                    has_auto_accessor = has_auto_accessor or property.kind == .auto_accessor;

                    // Forbid decorators on class constructors
                    if (opts.ts_decorators.len > 0) {
                        switch ((property.key orelse p.panic("Internal error: Expected property to have a key.", .{})).data) {
                            .e_string => |str| {
                                if (str.eqlComptime("constructor")) {
                                    p.log.addError(p.source, first_decorator_loc, "TypeScript does not allow decorators on class constructors") catch unreachable;
                                }
                            },
                            else => {},
                        }
                    }

                    has_decorators = has_decorators or opts.has_argument_decorators;
                }
            }

            if (class_opts.is_type_script_declare) {
                p.popAndDiscardScope(scopeIndex);
            } else {
                p.popScope();
            }

            p.allow_in = old_allow_in;
            p.allow_private_identifiers = old_allow_private_identifiers;
            const close_brace_loc = p.lexer.loc();
            try p.lexer.expect(.t_close_brace);

            const has_any_decorators = has_decorators or class_opts.ts_decorators.len > 0;
            return G.Class{
                .class_name = name,
                .extends = extends,
                .close_brace_loc = close_brace_loc,
                .ts_decorators = ExprNodeList.fromOwnedSlice(class_opts.ts_decorators),
                .class_keyword = class_keyword,
                .body_loc = body_loc,
                .properties = properties.items,
                .has_decorators = has_any_decorators,
                .should_lower_standard_decorators = p.options.features.standard_decorators and (has_any_decorators or has_auto_accessor),
            };
        }

        pub fn parseTemplateParts(p: *P, include_raw: bool) ![]E.TemplatePart {
            var parts = ListManaged(E.TemplatePart).initCapacity(p.allocator, 1) catch unreachable;
            // Allow "in" inside template literals
            const oldAllowIn = p.allow_in;
            p.allow_in = true;

            parseTemplatePart: while (true) {
                try p.lexer.next();
                const value = try p.parseExpr(.lowest);
                const tail_loc = p.lexer.loc();
                try p.lexer.rescanCloseBraceAsTemplateToken();

                const tail: E.Template.Contents = brk: {
                    if (!include_raw) break :brk .{ .cooked = try p.lexer.toEString() };
                    break :brk .{ .raw = p.lexer.rawTemplateContents() };
                };

                parts.append(E.TemplatePart{
                    .value = value,
                    .tail_loc = tail_loc,
                    .tail = tail,
                }) catch unreachable;

                if (p.lexer.token == .t_template_tail) {
                    try p.lexer.next();
                    break :parseTemplatePart;
                }
                if (comptime Environment.allow_assert)
                    assert(p.lexer.token != .t_end_of_file);
            }

            p.allow_in = oldAllowIn;

            return parts.items;
        }

        // This assumes the caller has already checked for TStringLiteral or TNoSubstitutionTemplateLiteral
        pub fn parseStringLiteral(p: *P) anyerror!Expr {
            const loc = p.lexer.loc();
            var str = try p.lexer.toEString();
            str.prefer_template = p.lexer.token == .t_no_substitution_template_literal;

            const expr = p.newExpr(str, loc);
            try p.lexer.next();
            return expr;
        }

        pub fn parseCallArgs(p: *P) anyerror!ExprListLoc {
            // Allow "in" inside call arguments
            const old_allow_in = p.allow_in;
            p.allow_in = true;
            defer p.allow_in = old_allow_in;

            var args = ListManaged(Expr).init(p.allocator);
            try p.lexer.expect(.t_open_paren);

            while (p.lexer.token != .t_close_paren) {
                const loc = p.lexer.loc();
                const is_spread = p.lexer.token == .t_dot_dot_dot;
                if (is_spread) {
                    // p.mark_syntax_feature(compat.rest_argument, p.lexer.range());
                    try p.lexer.next();
                }
                // Parabun: bare-dot lambda sugar in argument position —
                // `map(.score)` desugars to `map(__pcv => __pcv.score)`.
                // Same rule used after chain operators (`..> .json()`).
                // Only triggered when a non-spread arg starts with `.`,
                // which is otherwise a syntax error so this disambiguates
                // cleanly. Numeric literals like `.5` lex as a single
                // t_numeric_literal, not t_dot, so they're unaffected.
                var arg = if (!is_spread and p.lexer.token == .t_dot)
                    try p.parseLeadingDotLambda(loc)
                else
                    try p.parseExpr(.comma);
                if (is_spread) {
                    arg = p.newExpr(E.Spread{ .value = arg }, loc);
                }
                args.append(arg) catch unreachable;
                if (p.lexer.token != .t_comma) {
                    break;
                }
                try p.lexer.next();
            }
            const close_paren_loc = p.lexer.loc();
            try p.lexer.expect(.t_close_paren);
            return ExprListLoc{ .list = ExprNodeList.moveFromList(&args), .loc = close_paren_loc };
        }

        pub fn parseJSXPropValueIdentifier(noalias p: *P, previous_string_with_backslash_loc: *logger.Loc) !Expr {
            // Use NextInsideJSXElement() not Next() so we can parse a JSX-style string literal
            try p.lexer.nextInsideJSXElement();
            if (p.lexer.token == .t_string_literal) {
                previous_string_with_backslash_loc.start = @max(p.lexer.loc().start, p.lexer.previous_backslash_quote_in_jsx.loc.start);
                const expr = p.newExpr(try p.lexer.toEString(), previous_string_with_backslash_loc.*);

                try p.lexer.nextInsideJSXElement();
                return expr;
            } else {
                // Use Expect() not ExpectInsideJSXElement() so we can parse expression tokens
                try p.lexer.expect(.t_open_brace);
                const value = try p.parseExpr(.lowest);

                try p.lexer.expectInsideJSXElement(.t_close_brace);
                return value;
            }
        }

        /// This assumes that the open parenthesis has already been parsed by the caller
        pub fn parseParenExpr(p: *P, loc: logger.Loc, level: Level, opts: ParenExprOpts) anyerror!Expr {
            var items_list = ListManaged(Expr).init(p.allocator);
            var errors = DeferredErrors{};
            var arrowArgErrors = DeferredArrowArgErrors{};
            var spread_range = logger.Range{};
            var type_colon_range = logger.Range{};
            var comma_after_spread: ?logger.Loc = null;

            // Push a scope assuming this is an arrow function. It may not be, in which
            // case we'll need to roll this change back. This has to be done ahead of
            // parsing the arguments instead of later on when we hit the "=>" token and
            // we know it's an arrow function because the arguments may have default
            // values that introduce new scopes and declare new symbols. If this is an
            // arrow function, then those new scopes will need to be parented under the
            // scope of the arrow function itself.
            const scope_index = try p.pushScopeForParsePass(.function_args, loc);

            // Allow "in" inside parentheses
            const oldAllowIn = p.allow_in;
            p.allow_in = true;

            // Parabun: parens are an explicit escape from chain-op RHS
            // terminator behavior so an arrow body can opt back in to nested
            // chain operators by wrapping with `(...)`. Restored once the
            // close paren is consumed so an arrow body that follows runs with
            // the outer flag (a bare arrow `..> (x) => x + 1 ..! err` still
            // terminates the body before the next chain op).
            const old_in_chain_op_arrow_rhs = p.in_chain_op_arrow_rhs;
            p.in_chain_op_arrow_rhs = false;

            // Forbid "await" and "yield", but only for arrow functions
            var old_fn_or_arrow_data = std.mem.toBytes(p.fn_or_arrow_data_parse);
            p.fn_or_arrow_data_parse.arrow_arg_errors = arrowArgErrors;
            p.fn_or_arrow_data_parse.track_arrow_arg_errors = true;
            // Parabun: suppress free-variable checks while parsing potential
            // arrow params — identifiers here may become parameter bindings,
            // not references. The arrow body will re-establish purity checking.
            // This applies both to explicitly-pure arrows (pure (...) =>) and
            // inherited-pure arrows (non-pure arrows inside a pure function).
            if (opts.is_pure or p.fn_or_arrow_data_parse.is_pure) p.fn_or_arrow_data_parse.pure_fn_scope = null;

            // Scan over the comma-separated arguments or expressions
            while (p.lexer.token != .t_close_paren) {
                const is_spread = p.lexer.token == .t_dot_dot_dot;

                if (is_spread) {
                    spread_range = p.lexer.range();
                    // p.markSyntaxFeature()
                    try p.lexer.next();
                }

                // We don't know yet whether these are arguments or expressions, so parse
                p.latest_arrow_arg_loc = p.lexer.loc();

                try items_list.ensureUnusedCapacity(1);
                const item: *Expr = &items_list.unusedCapacitySlice()[0];
                try p.parseExprOrBindings(.comma, &errors, item);
                items_list.items.len += 1;

                if (is_spread) {
                    item.* = p.newExpr(E.Spread{ .value = item.* }, loc);
                }

                // Skip over types
                if (is_typescript_enabled and p.lexer.token == .t_colon) {
                    type_colon_range = p.lexer.range();
                    try p.lexer.next();
                    try p.skipTypeScriptType(.lowest);
                }

                // There may be a "=" after the type (but not after an "as" cast)
                if (is_typescript_enabled and p.lexer.token == .t_equals and !p.forbid_suffix_after_as_loc.eql(p.lexer.loc())) {
                    try p.lexer.next();
                    item.* = Expr.assign(item.*, try p.parseExpr(.comma));
                }

                if (p.lexer.token != .t_comma) {
                    break;
                }

                // Spread arguments must come last. If there's a spread argument followed
                if (is_spread) {
                    comma_after_spread = p.lexer.loc();
                }

                // Eat the comma token
                try p.lexer.next();
            }
            var items = items_list.items;

            // The parenthetical construct must end with a close parenthesis
            try p.lexer.expect(.t_close_paren);

            // Restore "in" operator status before we parse the arrow function body
            p.allow_in = oldAllowIn;
            // Parabun: restore the chain-op RHS terminator flag so an arrow
            // body that follows the parens runs with the outer context.
            p.in_chain_op_arrow_rhs = old_in_chain_op_arrow_rhs;

            // Also restore "await" and "yield" expression errors
            p.fn_or_arrow_data_parse = std.mem.bytesToValue(@TypeOf(p.fn_or_arrow_data_parse), &old_fn_or_arrow_data);

            // Are these arguments to an arrow function?
            if (p.lexer.token == .t_equals_greater_than or opts.force_arrow_fn or (is_typescript_enabled and p.lexer.token == .t_colon)) {
                // Arrow functions are not allowed inside certain expressions
                if (level.gt(.assign)) {
                    try p.lexer.unexpected();
                    return error.SyntaxError;
                }

                var invalidLog = LocList.init(p.allocator);
                var args = ListManaged(G.Arg).init(p.allocator);

                if (opts.is_async) {
                    // markl,oweredsyntaxpoksdpokasd
                }

                // First, try converting the expressions to bindings
                for (items, 0..) |_, i| {
                    var is_spread = false;
                    switch (items[i].data) {
                        .e_spread => |v| {
                            is_spread = true;
                            items[i] = v.value;
                        },
                        else => {},
                    }

                    var item = items[i];
                    const tuple = p.convertExprToBindingAndInitializer(&item, &invalidLog, is_spread);
                    // double allocations
                    args.append(G.Arg{
                        .binding = tuple.binding orelse Binding{ .data = Prefill.Data.BMissing, .loc = item.loc },
                        .default = tuple.expr,
                    }) catch unreachable;
                }

                // Avoid parsing TypeScript code like "a ? (1 + 2) : (3 + 4)" as an arrow
                // function. The ":" after the ")" may be a return type annotation, so we
                // attempt to convert the expressions to bindings first before deciding
                // whether this is an arrow function, and only pick an arrow function if
                // there were no conversion errors.
                if (p.lexer.token == .t_equals_greater_than or ((comptime is_typescript_enabled) and
                    invalidLog.items.len == 0 and
                    p.trySkipTypeScriptArrowReturnTypeWithBacktracking()) or
                    opts.force_arrow_fn)
                {
                    p.maybeCommaSpreadError(comma_after_spread);
                    p.logArrowArgErrors(&arrowArgErrors);

                    // Now that we've decided we're an arrow function, report binding pattern
                    // conversion errors
                    if (invalidLog.items.len > 0) {
                        for (invalidLog.items) |_loc| {
                            _loc.addError(
                                p.log,
                                p.source,
                            );
                        }
                    }
                    var arrow_data = FnOrArrowDataParse{
                        .allow_await = if (opts.is_async) AwaitOrYield.allow_expr else AwaitOrYield.allow_ident,
                        .is_pure = opts.is_pure,
                    };
                    var arrow = try p.parseArrowBody(args.items, &arrow_data);
                    arrow.is_async = opts.is_async;
                    arrow.is_pure = opts.is_pure;
                    arrow.has_rest_arg = spread_range.len > 0;
                    p.popScope();
                    return p.newExpr(arrow, loc);
                }
            }

            // If we get here, it's not an arrow function so undo the pushing of the
            // scope we did earlier. This needs to flatten any child scopes into the
            // parent scope as if the scope was never pushed in the first place.
            p.popAndFlattenScope(scope_index);

            // If this isn't an arrow function, then types aren't allowed
            if (type_colon_range.len > 0) {
                try p.log.addRangeError(p.source, type_colon_range, "Unexpected \":\"");
                return error.SyntaxError;
            }

            // Are these arguments for a call to a function named "async"?
            if (opts.is_async) {
                p.logExprErrors(&errors);
                const async_expr = p.newExpr(E.Identifier{ .ref = try p.storeNameInRef("async") }, loc);
                return p.newExpr(E.Call{
                    .target = async_expr,
                    .args = ExprNodeList.fromOwnedSlice(items),
                }, loc);
            }

            // Is this a chain of expressions and comma operators?
            if (items.len > 0) {
                p.logExprErrors(&errors);
                if (spread_range.len > 0) {
                    try p.log.addRangeError(p.source, type_colon_range, "Unexpected \"...\"");
                    return error.SyntaxError;
                }

                var value = Expr.joinAllWithComma(items, p.allocator);
                p.markExprAsParenthesized(&value);
                return value;
            }

            // Indicate that we expected an arrow function
            try p.lexer.expected(.t_equals_greater_than);
            return error.SyntaxError;
        }

        pub fn parseLabelName(p: *P) !?js_ast.LocRef {
            if (p.lexer.token != .t_identifier or p.lexer.has_newline_before) {
                return null;
            }

            const name = LocRef{ .loc = p.lexer.loc(), .ref = try p.storeNameInRef(p.lexer.identifier) };
            try p.lexer.next();
            return name;
        }

        pub fn parseClassStmt(p: *P, loc: logger.Loc, opts: *ParseStatementOptions) !Stmt {
            var name: ?js_ast.LocRef = null;
            const class_keyword = p.lexer.range();
            if (p.lexer.token == .t_class) {
                //marksyntaxfeature
                try p.lexer.next();
            } else {
                try p.lexer.expected(.t_class);
            }

            const is_identifier = p.lexer.token == .t_identifier;

            if (!opts.is_name_optional or (is_identifier and (!is_typescript_enabled or !strings.eqlComptime(p.lexer.identifier, "implements")))) {
                const name_loc = p.lexer.loc();
                const name_text = p.lexer.identifier;
                try p.lexer.expect(.t_identifier);

                // We must return here
                // or the lexer will crash loop!
                // example:
                // export class {}
                if (!is_identifier) {
                    return error.SyntaxError;
                }

                if (p.fn_or_arrow_data_parse.allow_await != .allow_ident and strings.eqlComptime(name_text, "await")) {
                    try p.log.addRangeError(p.source, p.lexer.range(), "Cannot use \"await\" as an identifier here");
                }

                name = LocRef{ .loc = name_loc, .ref = null };
                if (!opts.is_typescript_declare) {
                    (name orelse unreachable).ref = p.declareSymbol(.class, name_loc, name_text) catch unreachable;
                }
            }

            // Even anonymous classes can have TypeScript type parameters
            if (is_typescript_enabled) {
                _ = try p.skipTypeScriptTypeParameters(.{
                    .allow_in_out_variance_annotations = true,
                    .allow_const_modifier = true,
                });
            }
            var class_opts = ParseClassOptions{
                .allow_ts_decorators = true,
                .is_type_script_declare = opts.is_typescript_declare,
            };
            if (opts.ts_decorators) |dec| {
                class_opts.ts_decorators = dec.values;
            }

            const scope_index = p.pushScopeForParsePass(.class_name, loc) catch unreachable;
            const class = try p.parseClass(class_keyword, name, class_opts);

            if (comptime is_typescript_enabled) {
                if (opts.is_typescript_declare) {
                    p.popAndDiscardScope(scope_index);
                    if (opts.is_namespace_scope and opts.is_export) {
                        p.has_non_local_export_declare_inside_namespace = true;
                    }

                    return p.s(S.TypeScript{}, loc);
                }
            }

            p.popScope();
            return p.s(S.Class{
                .class = class,
                .is_export = opts.is_export,
            }, loc);
        }

        pub fn parseClauseAlias(p: *P, kind: string) !string {
            const loc = p.lexer.loc();

            // The alias may now be a utf-16 (not wtf-16) string (see https://github.com/tc39/ecma262/pull/2154)
            if (p.lexer.token == .t_string_literal) {
                var estr = try p.lexer.toEString();
                if (estr.isUTF8()) {
                    return estr.slice8();
                } else if (strings.toUTF8AllocWithTypeWithoutInvalidSurrogatePairs(p.lexer.allocator, estr.slice16())) |alias_utf8| {
                    return alias_utf8;
                } else |err| {
                    const r = p.source.rangeOfString(loc);
                    try p.log.addRangeErrorFmt(p.source, r, p.allocator, "Invalid {s} alias because it contains an unpaired Unicode surrogate ({s})", .{ kind, @errorName(err) });
                    return p.source.textForRange(r);
                }
            }

            // The alias may be a keyword
            if (!p.lexer.isIdentifierOrKeyword()) {
                try p.lexer.expect(.t_identifier);
            }

            const alias = p.lexer.identifier;
            p.checkForNonBMPCodePoint(loc, alias);
            return alias;
        }

        pub fn parseExprOrLetStmt(p: *P, opts: *ParseStatementOptions) !ExprOrLetStmt {
            const token_range = p.lexer.range();

            if (p.lexer.token != .t_identifier) {
                return ExprOrLetStmt{ .stmt_or_expr = js_ast.StmtOrExpr{ .expr = try p.parseExpr(.lowest) } };
            }

            const raw = p.lexer.raw();
            if (strings.eqlComptime(raw, "let")) {
                try p.lexer.next();

                switch (p.lexer.token) {
                    .t_identifier, .t_open_bracket, .t_open_brace => {
                        if (opts.lexical_decl == .allow_all or !p.lexer.has_newline_before or p.lexer.token == .t_open_bracket) {
                            if (opts.lexical_decl != .allow_all) {
                                try p.forbidLexicalDecl(token_range.loc);
                            }

                            var decls_list = try p.parseAndDeclareDecls(.other, opts);
                            const decls: G.Decl.List = .moveFromList(&decls_list);
                            return ExprOrLetStmt{
                                .stmt_or_expr = js_ast.StmtOrExpr{
                                    .stmt = p.s(S.Local{
                                        .kind = .k_let,
                                        .decls = decls,
                                        .is_export = opts.is_export,
                                    }, token_range.loc),
                                },
                                .decls = decls.slice(),
                            };
                        }
                    },
                    else => {},
                }
            } else if (strings.eqlComptime(raw, "using")) {
                // Handle an "using" declaration
                if (opts.is_export) {
                    try p.log.addError(p.source, token_range.loc, "Cannot use \"export\" with a \"using\" declaration");
                }

                try p.lexer.next();

                if (p.lexer.token == .t_identifier and !p.lexer.has_newline_before) {
                    if (opts.lexical_decl != .allow_all) {
                        try p.forbidLexicalDecl(token_range.loc);
                    }
                    // p.markSyntaxFeature(.using, token_range.loc);
                    opts.is_using_statement = true;
                    var decls_list = try p.parseAndDeclareDecls(.constant, opts);
                    const decls: G.Decl.List = .moveFromList(&decls_list);
                    if (!opts.is_for_loop_init) {
                        try p.requireInitializers(.k_using, decls.slice());
                    }
                    return ExprOrLetStmt{
                        .stmt_or_expr = js_ast.StmtOrExpr{
                            .stmt = p.s(S.Local{
                                .kind = .k_using,
                                .decls = decls,
                                .is_export = false,
                            }, token_range.loc),
                        },
                        .decls = decls.slice(),
                    };
                }
            } else if (p.fn_or_arrow_data_parse.allow_await == .allow_expr and strings.eqlComptime(raw, "await")) {
                // Handle an "await using" declaration
                if (opts.is_export) {
                    try p.log.addError(p.source, token_range.loc, "Cannot use \"export\" with an \"await using\" declaration");
                }

                if (p.fn_or_arrow_data_parse.is_top_level) {
                    p.top_level_await_keyword = token_range;
                }

                try p.lexer.next();

                const raw2 = p.lexer.raw();
                var value = if (p.lexer.token == .t_identifier and strings.eqlComptime(raw2, "using")) value: {
                    // const using_loc = p.saveExprCommentsHere();
                    const using_range = p.lexer.range();
                    try p.lexer.next();
                    if (p.lexer.token == .t_identifier and !p.lexer.has_newline_before) {
                        // It's an "await using" declaration if we get here
                        if (opts.lexical_decl != .allow_all) {
                            try p.forbidLexicalDecl(using_range.loc);
                        }
                        // p.markSyntaxFeature(.using, using_range.loc);
                        opts.is_using_statement = true;
                        var decls_list = try p.parseAndDeclareDecls(.constant, opts);
                        const decls: G.Decl.List = .moveFromList(&decls_list);
                        if (!opts.is_for_loop_init) {
                            try p.requireInitializers(.k_await_using, decls.slice());
                        }
                        return ExprOrLetStmt{
                            .stmt_or_expr = js_ast.StmtOrExpr{
                                .stmt = p.s(S.Local{
                                    .kind = .k_await_using,
                                    .decls = decls,
                                    .is_export = false,
                                }, token_range.loc),
                            },
                            .decls = decls.slice(),
                        };
                    }
                    break :value Expr{
                        .data = .{ .e_identifier = .{ .ref = try p.storeNameInRef(raw) } },
                        // TODO: implement saveExprCommentsHere and use using_loc here
                        .loc = using_range.loc,
                    };
                } else try p.parseExpr(.prefix);

                if (p.lexer.token == .t_asterisk_asterisk) {
                    try p.lexer.unexpected();
                }
                try p.parseSuffix(&value, .prefix, null, .none);
                var expr = p.newExpr(
                    E.Await{ .value = value },
                    token_range.loc,
                );
                try p.parseSuffix(&expr, .lowest, null, .none);
                return ExprOrLetStmt{
                    .stmt_or_expr = js_ast.StmtOrExpr{
                        .expr = expr,
                    },
                };
            } else {
                return ExprOrLetStmt{
                    .stmt_or_expr = js_ast.StmtOrExpr{
                        .expr = try p.parseExpr(.lowest),
                    },
                };
            }

            // Parse the remainder of this expression that starts with an identifier
            const ref = try p.storeNameInRef(raw);
            var result = ExprOrLetStmt{
                .stmt_or_expr = js_ast.StmtOrExpr{
                    .expr = p.newExpr(E.Identifier{ .ref = ref }, token_range.loc),
                },
            };
            try p.parseSuffix(&result.stmt_or_expr.expr, .lowest, null, .none);
            return result;
        }

        pub fn parseBinding(p: *P, comptime opts: ParseBindingOptions) anyerror!Binding {
            const loc = p.lexer.loc();

            switch (p.lexer.token) {
                .t_identifier => {
                    const name = p.lexer.identifier;
                    if ((p.fn_or_arrow_data_parse.allow_await != .allow_ident and strings.eqlComptime(name, "await")) or (p.fn_or_arrow_data_parse.allow_yield != .allow_ident and strings.eqlComptime(name, "yield"))) {
                        // TODO: add fmt to addRangeError
                        p.log.addRangeError(p.source, p.lexer.range(), "Cannot use \"yield\" or \"await\" here.") catch unreachable;
                    }

                    const ref = p.storeNameInRef(name) catch unreachable;
                    try p.lexer.next();
                    return p.b(B.Identifier{ .ref = ref }, loc);
                },
                .t_open_bracket => {
                    if (!opts.is_using_statement) {
                        try p.lexer.next();
                        var is_single_line = !p.lexer.has_newline_before;
                        var items = ListManaged(js_ast.ArrayBinding).init(p.allocator);
                        var has_spread = false;

                        // "in" expressions are allowed
                        const old_allow_in = p.allow_in;
                        p.allow_in = true;

                        while (p.lexer.token != .t_close_bracket) {
                            if (p.lexer.token == .t_comma) {
                                items.append(js_ast.ArrayBinding{
                                    .binding = Binding{ .data = Prefill.Data.BMissing, .loc = p.lexer.loc() },
                                }) catch unreachable;
                            } else {
                                if (p.lexer.token == .t_dot_dot_dot) {
                                    try p.lexer.next();
                                    has_spread = true;

                                    // This was a bug in the ES2015 spec that was fixed in ES2016
                                    if (p.lexer.token != .t_identifier) {
                                        // p.markSyntaxFeature(compat.NestedRestBinding, p.lexer.Range())

                                    }
                                }

                                const binding = try p.parseBinding(opts);

                                var default_value: ?Expr = null;
                                if (!has_spread and p.lexer.token == .t_equals) {
                                    try p.lexer.next();
                                    default_value = try p.parseExpr(.comma);
                                }

                                items.append(js_ast.ArrayBinding{ .binding = binding, .default_value = default_value }) catch unreachable;

                                // Commas after spread elements are not allowed
                                if (has_spread and p.lexer.token == .t_comma) {
                                    p.log.addRangeError(p.source, p.lexer.range(), "Unexpected \",\" after rest pattern") catch unreachable;
                                    return error.SyntaxError;
                                }
                            }

                            if (p.lexer.token != .t_comma) {
                                break;
                            }

                            if (p.lexer.has_newline_before) {
                                is_single_line = false;
                            }
                            try p.lexer.next();

                            if (p.lexer.has_newline_before) {
                                is_single_line = false;
                            }
                        }

                        p.allow_in = old_allow_in;

                        if (p.lexer.has_newline_before) {
                            is_single_line = false;
                        }
                        try p.lexer.expect(.t_close_bracket);
                        return p.b(B.Array{
                            .items = items.items,
                            .has_spread = has_spread,
                            .is_single_line = is_single_line,
                        }, loc);
                    }
                },
                .t_open_brace => {
                    if (!opts.is_using_statement) {
                        // p.markSyntaxFeature(compat.Destructuring, p.lexer.Range())
                        try p.lexer.next();
                        var is_single_line = !p.lexer.has_newline_before;
                        var properties = ListManaged(js_ast.B.Property).init(p.allocator);

                        // "in" expressions are allowed
                        const old_allow_in = p.allow_in;
                        p.allow_in = true;

                        while (p.lexer.token != .t_close_brace) {
                            var property = try p.parsePropertyBinding();
                            properties.append(property) catch unreachable;

                            // Commas after spread elements are not allowed
                            if (property.flags.contains(.is_spread) and p.lexer.token == .t_comma) {
                                p.log.addRangeError(p.source, p.lexer.range(), "Unexpected \",\" after rest pattern") catch unreachable;
                                return error.SyntaxError;
                            }

                            if (p.lexer.token != .t_comma) {
                                break;
                            }

                            if (p.lexer.has_newline_before) {
                                is_single_line = false;
                            }
                            try p.lexer.next();
                            if (p.lexer.has_newline_before) {
                                is_single_line = false;
                            }
                        }

                        p.allow_in = old_allow_in;

                        if (p.lexer.has_newline_before) {
                            is_single_line = false;
                        }
                        try p.lexer.expect(.t_close_brace);

                        return p.b(B.Object{
                            .properties = properties.items,
                            .is_single_line = is_single_line,
                        }, loc);
                    }
                },
                else => {},
            }

            try p.lexer.expect(.t_identifier);
            return Binding{ .loc = loc, .data = Prefill.Data.BMissing };
        }

        pub fn parsePropertyBinding(p: *P) anyerror!B.Property {
            var key: js_ast.Expr = Expr{ .loc = logger.Loc.Empty, .data = Prefill.Data.EMissing };
            var is_computed = false;

            switch (p.lexer.token) {
                .t_dot_dot_dot => {
                    try p.lexer.next();
                    const value = p.b(
                        B.Identifier{
                            .ref = p.storeNameInRef(p.lexer.identifier) catch unreachable,
                        },
                        p.lexer.loc(),
                    );
                    try p.lexer.expect(.t_identifier);
                    return B.Property{
                        .key = p.newExpr(E.Missing{}, p.lexer.loc()),

                        .flags = Flags.Property.init(.{ .is_spread = true }),
                        .value = value,
                    };
                },
                .t_numeric_literal => {
                    key = p.newExpr(E.Number{
                        .value = p.lexer.number,
                    }, p.lexer.loc());
                    // check for legacy octal literal
                    try p.lexer.next();
                },
                .t_string_literal => {
                    key = try p.parseStringLiteral();
                },
                .t_big_integer_literal => {
                    key = p.newExpr(E.BigInt{
                        .value = p.lexer.identifier,
                    }, p.lexer.loc());
                    // p.markSyntaxFeature(compat.BigInt, p.lexer.Range())
                    try p.lexer.next();
                },
                .t_open_bracket => {
                    is_computed = true;
                    try p.lexer.next();
                    key = try p.parseExpr(.comma);
                    try p.lexer.expect(.t_close_bracket);
                },
                else => {
                    const name = p.lexer.identifier;
                    const loc = p.lexer.loc();

                    if (!p.lexer.isIdentifierOrKeyword()) {
                        try p.lexer.expect(.t_identifier);
                    }

                    try p.lexer.next();

                    key = p.newExpr(E.String{ .data = name }, loc);

                    if (p.lexer.token != .t_colon and p.lexer.token != .t_open_paren) {
                        const ref = p.storeNameInRef(name) catch unreachable;
                        const value = p.b(B.Identifier{ .ref = ref }, loc);
                        var default_value: ?Expr = null;
                        if (p.lexer.token == .t_equals) {
                            try p.lexer.next();
                            default_value = try p.parseExpr(.comma);
                        }

                        return B.Property{
                            .key = key,
                            .value = value,
                            .default_value = default_value,
                        };
                    }
                },
            }

            try p.lexer.expect(.t_colon);
            const value = try p.parseBinding(.{});

            var default_value: ?Expr = null;
            if (p.lexer.token == .t_equals) {
                try p.lexer.next();
                default_value = try p.parseExpr(.comma);
            }

            return B.Property{
                .flags = Flags.Property.init(.{
                    .is_computed = is_computed,
                }),
                .key = key,
                .value = value,
                .default_value = default_value,
            };
        }

        pub fn parseAndDeclareDecls(p: *P, kind: Symbol.Kind, opts: *ParseStatementOptions) anyerror!ListManaged(G.Decl) {
            var decls = ListManaged(G.Decl).init(p.allocator);

            while (true) {
                // Forbid "let let" and "const let" but not "var let"
                if ((kind == .other or kind == .constant) and p.lexer.isContextualKeyword("let")) {
                    p.log.addRangeError(p.source, p.lexer.range(), "Cannot use \"let\" as an identifier here") catch unreachable;
                }

                var value: ?js_ast.Expr = null;
                var local = switch (opts.is_using_statement) {
                    inline else => |is_using| try p.parseBinding(.{
                        .is_using_statement = is_using,
                    }),
                };
                p.declareBinding(kind, &local, opts) catch unreachable;

                // Skip over types
                if (comptime is_typescript_enabled) {
                    // "let foo!"
                    const is_definite_assignment_assertion = p.lexer.token == .t_exclamation and !p.lexer.has_newline_before;
                    if (is_definite_assignment_assertion) {
                        try p.lexer.next();
                    }

                    // "let foo: number"
                    if (is_definite_assignment_assertion or p.lexer.token == .t_colon) {
                        try p.lexer.expect(.t_colon);
                        try p.skipTypeScriptType(.lowest);
                    }
                }

                if (p.lexer.token == .t_equals) {
                    try p.lexer.next();
                    value = try p.parseExpr(.comma);
                } else if (p.lexer.token == .t_dot_dot_equals) {
                    // Parabun: `..=` in declaration init position used to mean
                    // await-assign (`const x ..= fetch()` → `const x = await fetch()`).
                    // Removed 2026-04 — `..=` now exclusively means inclusive range.
                    // Use `const x = await EXPR` directly.
                    p.log.addRangeError(
                        p.source,
                        p.lexer.range(),
                        "\"..=\" is no longer await-assign; use `= await EXPR` instead. (`..=` between two expressions is still an inclusive range.)",
                    ) catch unreachable;
                    try p.lexer.next();
                    value = try p.parseExpr(.comma);
                }

                decls.append(G.Decl{
                    .binding = local,
                    .value = value,
                }) catch unreachable;

                if (p.lexer.token != .t_comma) {
                    break;
                }
                try p.lexer.next();
            }

            return decls;
        }

        pub fn parsePath(p: *P) !ParsedPath {
            const path_text = try p.lexer.toUTF8EString();
            var path = ParsedPath{
                .loc = p.lexer.loc(),
                .text = path_text.slice8(),
                .is_macro = false,
                .import_tag = .none,
            };

            if (p.lexer.token == .t_no_substitution_template_literal) {
                try p.lexer.next();
            } else {
                try p.lexer.expect(.t_string_literal);
            }

            if (!p.lexer.has_newline_before and (
                // Import Assertions are deprecated.
                // Import Attributes are the new way to do this.
                // But some code may still use "assert"
                // We support both and treat them identically.
                // Once Prettier & TypeScript support import attributes, we will add runtime support
                p.lexer.isContextualKeyword("assert") or p.lexer.token == .t_with))
            {
                try p.lexer.next();
                try p.lexer.expect(.t_open_brace);

                const SupportedAttribute = enum {
                    type,
                    embed,
                    bunBakeGraph,
                };

                var has_seen_embed_true = false;

                while (p.lexer.token != .t_close_brace) {
                    const supported_attribute: ?SupportedAttribute = brk: {
                        // Parse the key
                        if (p.lexer.isIdentifierOrKeyword()) {
                            inline for (comptime std.enums.values(SupportedAttribute)) |t| {
                                if (strings.eqlComptime(p.lexer.identifier, @tagName(t))) {
                                    break :brk t;
                                }
                            }
                        } else if (p.lexer.token == .t_string_literal) {
                            const string_literal_text = (try p.lexer.toUTF8EString()).slice8();
                            inline for (comptime std.enums.values(SupportedAttribute)) |t| {
                                if (strings.eqlComptime(string_literal_text, @tagName(t))) {
                                    break :brk t;
                                }
                            }
                        } else {
                            try p.lexer.expect(.t_identifier);
                        }

                        break :brk null;
                    };

                    try p.lexer.next();
                    try p.lexer.expect(.t_colon);

                    try p.lexer.expect(.t_string_literal);
                    const string_literal_text = (try p.lexer.toUTF8EString()).slice8();
                    if (supported_attribute) |attr| {
                        switch (attr) {
                            .type => {
                                // This logic is duplicated in js_ast.zig fn importRecordTag()
                                const type_attr = string_literal_text;
                                if (strings.eqlComptime(type_attr, "macro")) {
                                    path.is_macro = true;
                                } else if (bun.options.Loader.fromString(type_attr)) |loader| {
                                    path.loader = loader;
                                    if (loader == .sqlite and has_seen_embed_true) path.loader = .sqlite_embedded;
                                } else {
                                    // unknown loader; consider erroring
                                }
                            },
                            .embed => {
                                if (strings.eqlComptime(string_literal_text, "true")) {
                                    has_seen_embed_true = true;
                                    if (path.loader != null and path.loader == .sqlite) {
                                        path.loader = .sqlite_embedded;
                                    }
                                }
                            },
                            .bunBakeGraph => {
                                if (strings.eqlComptime(string_literal_text, "ssr")) {
                                    path.import_tag = .bake_resolve_to_ssr_graph;
                                } else {
                                    try p.lexer.addRangeError(p.lexer.range(), "'bunBakeGraph' can only be set to 'ssr'", .{}, true);
                                }
                            },
                        }
                    }

                    if (p.lexer.token != .t_comma) {
                        break;
                    }

                    try p.lexer.next();
                }

                try p.lexer.expect(.t_close_brace);
            }

            return path;
        }

        pub fn parseStmtsUpTo(p: *P, eend: js_lexer.T, _opts: *ParseStatementOptions) ![]Stmt {
            var opts = _opts.*;
            var stmts = StmtList.init(p.allocator);

            var returnWithoutSemicolonStart: i32 = -1;
            opts.lexical_decl = .allow_all;
            var isDirectivePrologue = true;

            while (true) {
                for (p.lexer.comments_to_preserve_before.items) |comment| {
                    try stmts.append(p.s(S.Comment{
                        .text = comment.text,
                    }, p.lexer.loc()));
                }
                p.lexer.comments_to_preserve_before.clearRetainingCapacity();

                if (p.lexer.token == eend) {
                    break;
                }

                var current_opts = opts;
                var stmt = try p.parseStmt(&current_opts);

                // Skip TypeScript types entirely
                if (is_typescript_enabled) {
                    switch (stmt.data) {
                        .s_type_script => {
                            continue;
                        },
                        else => {},
                    }
                }

                var skip = stmt.data == .s_empty;
                // Parse one or more directives at the beginning
                if (isDirectivePrologue) {
                    isDirectivePrologue = false;
                    switch (stmt.data) {
                        .s_expr => |expr| {
                            switch (expr.value.data) {
                                .e_string => |str| {
                                    if (!str.prefer_template) {
                                        isDirectivePrologue = true;

                                        if (str.eqlComptime("use strict")) {
                                            skip = true;
                                            // Track "use strict" directives
                                            p.current_scope.strict_mode = .explicit_strict_mode;
                                            if (p.current_scope == p.module_scope)
                                                p.module_scope_directive_loc = stmt.loc;
                                        } else if (str.eqlComptime("use asm")) {
                                            skip = true;
                                            stmt.data = Prefill.Data.SEmpty;
                                        } else {
                                            stmt = Stmt.alloc(S.Directive, S.Directive{
                                                .value = str.slice(p.allocator),
                                            }, stmt.loc);
                                        }
                                    }
                                },
                                else => {},
                            }
                        },
                        else => {},
                    }
                }

                if (!skip)
                    try stmts.append(stmt);

                // Warn about ASI and return statements. Here's an example of code with
                // this problem: https://github.com/rollup/rollup/issues/3729
                if (!p.options.suppress_warnings_about_weird_code) {
                    var needsCheck = true;
                    switch (stmt.data) {
                        .s_return => |ret| {
                            if (ret.value == null and !p.latest_return_had_semicolon) {
                                returnWithoutSemicolonStart = stmt.loc.start;
                                needsCheck = false;
                            }
                        },
                        else => {},
                    }

                    if (needsCheck and returnWithoutSemicolonStart != -1) {
                        switch (stmt.data) {
                            .s_expr => {
                                try p.log.addWarning(
                                    p.source,
                                    logger.Loc{ .start = returnWithoutSemicolonStart + 6 },
                                    "The following expression is not returned because of an automatically-inserted semicolon",
                                );
                            },
                            else => {},
                        }

                        returnWithoutSemicolonStart = -1;
                    }
                }
            }

            return stmts.items;
        }

        /// This parses an expression. This assumes we've already parsed the "async"
        /// keyword and are currently looking at the following token.
        pub fn parseAsyncPrefixExpr(p: *P, async_range: logger.Range, level: Level) !Expr {
            // "async function() {}"
            if (!p.lexer.has_newline_before and p.lexer.token == T.t_function) {
                return try p.parseFnExpr(async_range.loc, true, async_range, false);
            }

            // Check the precedence level to avoid parsing an arrow function in
            // "new async () => {}". This also avoids parsing "new async()" as
            // "new (async())()" instead.
            if (!p.lexer.has_newline_before and level.lt(.member)) {
                switch (p.lexer.token) {
                    // "async => {}"
                    .t_equals_greater_than => {
                        if (level.lte(.assign)) {
                            var args = try p.allocator.alloc(G.Arg, 1);
                            args[0] = G.Arg{ .binding = p.b(
                                B.Identifier{
                                    .ref = try p.storeNameInRef("async"),
                                },
                                async_range.loc,
                            ) };
                            _ = p.pushScopeForParsePass(.function_args, async_range.loc) catch unreachable;
                            var data = FnOrArrowDataParse{
                                .needs_async_loc = async_range.loc,
                            };
                            const arrow_body = try p.parseArrowBody(args, &data);
                            p.popScope();
                            return p.newExpr(arrow_body, async_range.loc);
                        }
                    },
                    // "async x => {}"
                    .t_identifier => {
                        if (level.lte(.assign)) {
                            // p.markLoweredSyntaxFeature();

                            const ref = try p.storeNameInRef(p.lexer.identifier);
                            var args = try p.allocator.alloc(G.Arg, 1);
                            args[0] = G.Arg{ .binding = p.b(
                                B.Identifier{
                                    .ref = ref,
                                },
                                p.lexer.loc(),
                            ) };
                            try p.lexer.next();

                            _ = try p.pushScopeForParsePass(.function_args, async_range.loc);
                            defer p.popScope();

                            var data = FnOrArrowDataParse{
                                .allow_await = .allow_expr,
                                .needs_async_loc = args[0].binding.loc,
                            };
                            var arrowBody = try p.parseArrowBody(args, &data);
                            arrowBody.is_async = true;
                            return p.newExpr(arrowBody, async_range.loc);
                        }
                    },

                    // "async()"
                    // "async () => {}"
                    .t_open_paren => {
                        try p.lexer.next();
                        return p.parseParenExpr(async_range.loc, level, ParenExprOpts{ .is_async = true, .async_range = async_range });
                    },

                    // "async<T>()"
                    // "async <T>() => {}"
                    .t_less_than => {
                        if (is_typescript_enabled and (!is_jsx_enabled or try TypeScript.isTSArrowFnJSX(p))) {
                            switch (p.trySkipTypeScriptTypeParametersThenOpenParenWithBacktracking()) {
                                .did_not_skip_anything => {},
                                else => |result| {
                                    try p.lexer.next();
                                    return p.parseParenExpr(async_range.loc, level, ParenExprOpts{
                                        .is_async = true,
                                        .async_range = async_range,
                                        .force_arrow_fn = result == .definitely_type_parameters,
                                    });
                                },
                            }
                        }
                    },

                    else => {},
                }
            }

            // "async"
            // "async + 1"
            return p.newExpr(
                E.Identifier{ .ref = try p.storeNameInRef("async") },
                async_range.loc,
            );
        }

        // Parabun: Parse "pure function" / "pure () =>" / "pure x =>" prefix expressions
        pub fn parsePurePrefixExpr(p: *P, pure_range: logger.Range, level: Level) !Expr {
            // "pure function() {}"
            if (!p.lexer.has_newline_before and p.lexer.token == T.t_function) {
                return try p.parseFnExpr(pure_range.loc, false, logger.Range.None, true);
            }

            if (!p.lexer.has_newline_before and level.lt(.member)) {
                switch (p.lexer.token) {
                    // "pure x => expr"
                    .t_identifier => {
                        if (level.lte(.assign)) {
                            const ref = try p.storeNameInRef(p.lexer.identifier);
                            var args = try p.allocator.alloc(G.Arg, 1);
                            args[0] = G.Arg{ .binding = p.b(
                                B.Identifier{ .ref = ref },
                                p.lexer.loc(),
                            ) };
                            try p.lexer.next();

                            _ = try p.pushScopeForParsePass(.function_args, pure_range.loc);
                            defer p.popScope();

                            var data = FnOrArrowDataParse{
                                .needs_async_loc = args[0].binding.loc,
                                .is_pure = true,
                            };
                            var arrow = try p.parseArrowBody(args, &data);
                            arrow.is_pure = true;
                            return p.newExpr(arrow, pure_range.loc);
                        }
                    },

                    // "pure () => {}" / "pure (x) => expr"
                    .t_open_paren => {
                        try p.lexer.next();
                        return p.parseParenExpr(pure_range.loc, level, ParenExprOpts{ .is_pure = true });
                    },

                    // "pure <T>() => {}"
                    .t_less_than => {
                        if (is_typescript_enabled and (!is_jsx_enabled or try TypeScript.isTSArrowFnJSX(p))) {
                            switch (p.trySkipTypeScriptTypeParametersThenOpenParenWithBacktracking()) {
                                .did_not_skip_anything => {},
                                else => |result| {
                                    try p.lexer.next();
                                    return p.parseParenExpr(pure_range.loc, level, ParenExprOpts{
                                        .is_pure = true,
                                        .force_arrow_fn = result == .definitely_type_parameters,
                                    });
                                },
                            }
                        }
                    },

                    else => {},
                }
            }

            // "pure" as identifier
            return p.newExpr(
                E.Identifier{ .ref = try p.storeNameInRef("pure") },
                pure_range.loc,
            );
        }

        // Parabun: Parse "pure async function" / "pure async () =>" prefix expressions
        pub fn parsePureAsyncPrefixExpr(p: *P, pure_range: logger.Range, async_range: logger.Range, level: Level) !Expr {
            // "pure async function() {}"
            if (!p.lexer.has_newline_before and p.lexer.token == T.t_function) {
                return try p.parseFnExpr(pure_range.loc, true, async_range, true);
            }

            if (!p.lexer.has_newline_before and level.lt(.member)) {
                switch (p.lexer.token) {
                    // "pure async x => expr"
                    .t_identifier => {
                        if (level.lte(.assign)) {
                            const ref = try p.storeNameInRef(p.lexer.identifier);
                            var args = try p.allocator.alloc(G.Arg, 1);
                            args[0] = G.Arg{ .binding = p.b(
                                B.Identifier{ .ref = ref },
                                p.lexer.loc(),
                            ) };
                            try p.lexer.next();

                            _ = try p.pushScopeForParsePass(.function_args, pure_range.loc);
                            defer p.popScope();

                            var data = FnOrArrowDataParse{
                                .allow_await = .allow_expr,
                                .needs_async_loc = args[0].binding.loc,
                                .is_pure = true,
                            };
                            var arrow = try p.parseArrowBody(args, &data);
                            arrow.is_async = true;
                            arrow.is_pure = true;
                            return p.newExpr(arrow, pure_range.loc);
                        }
                    },

                    // "pure async () => {}"
                    .t_open_paren => {
                        try p.lexer.next();
                        return p.parseParenExpr(pure_range.loc, level, ParenExprOpts{
                            .is_async = true,
                            .is_pure = true,
                            .async_range = async_range,
                        });
                    },

                    // "pure async <T>() => {}"
                    .t_less_than => {
                        if (is_typescript_enabled and (!is_jsx_enabled or try TypeScript.isTSArrowFnJSX(p))) {
                            switch (p.trySkipTypeScriptTypeParametersThenOpenParenWithBacktracking()) {
                                .did_not_skip_anything => {},
                                else => |result| {
                                    try p.lexer.next();
                                    return p.parseParenExpr(pure_range.loc, level, ParenExprOpts{
                                        .is_async = true,
                                        .is_pure = true,
                                        .async_range = async_range,
                                        .force_arrow_fn = result == .definitely_type_parameters,
                                    });
                                },
                            }
                        }
                    },

                    else => {},
                }
            }

            // "pure async" as identifier expression (fallback)
            return p.newExpr(
                E.Identifier{ .ref = try p.storeNameInRef("pure") },
                pure_range.loc,
            );
        }

        // Parabun: parse `memo (params) => body` / `memo x => body` / `memo <T>(x) => body`
        // as an expression — wrapping the resulting (pure) arrow in __parabunMemo.
        // `memo function ...` / `memo fun ...` here is rejected with the same
        // migration hint as the statement form; fresh callers should always use
        // the arrow form (or the statement form).
        pub fn parseMemoPrefixExpr(p: *P, memo_range: logger.Range, level: Level) !Expr {
            if (!p.lexer.has_newline_before and p.lexer.token == T.t_function) {
                try p.log.addRangeError(p.source, p.lexer.range(), "`memo` introduces a function declaration — drop the `function`/`fun` keyword (write `memo (params) => ...`)");
                return error.SyntaxError;
            }

            // For the `(` form, we can't commit to arrow parsing without a
            // lookahead — otherwise `const x = memo(5);` (a plain call to the
            // `memo` identifier) gets mis-parsed: parseParenExpr would consume
            // `(5)` as a grouping, discarding the call. Peek first.
            if (!p.lexer.has_newline_before and p.lexer.token == .t_open_paren and !isArrowParenForm(p)) {
                return p.newExpr(
                    E.Identifier{ .ref = try p.storeNameInRef("memo") },
                    memo_range.loc,
                );
            }

            // Delegate to the pure-arrow parser, then wrap.
            const inner = try p.parsePurePrefixExpr(memo_range, level);
            if (inner.data == .e_arrow) {
                return wrapArrowAsMemo(p, inner, memo_range);
            }
            // parsePurePrefixExpr fell back to identifier — memo didn't head an
            // arrow. Return memo as a plain identifier so `memo.x` etc. still
            // work when `memo` is a user-defined binding.
            return p.newExpr(
                E.Identifier{ .ref = try p.storeNameInRef("memo") },
                memo_range.loc,
            );
        }

        // Parabun: parse `memo async (x) => body` / `memo async x => body`.
        pub fn parseMemoAsyncPrefixExpr(p: *P, memo_range: logger.Range, async_range: logger.Range, level: Level) !Expr {
            if (!p.lexer.has_newline_before and p.lexer.token == T.t_function) {
                try p.log.addRangeError(p.source, p.lexer.range(), "`memo` introduces a function declaration — drop the `function`/`fun` keyword (write `memo async (params) => ...`)");
                return error.SyntaxError;
            }

            // Same paren lookahead as the non-async form.
            if (!p.lexer.has_newline_before and p.lexer.token == .t_open_paren and !isArrowParenForm(p)) {
                return p.newExpr(
                    E.Identifier{ .ref = try p.storeNameInRef("memo") },
                    memo_range.loc,
                );
            }

            const inner = try p.parsePureAsyncPrefixExpr(memo_range, async_range, level);
            if (inner.data == .e_arrow) {
                return wrapArrowAsMemo(p, inner, memo_range);
            }
            return p.newExpr(
                E.Identifier{ .ref = try p.storeNameInRef("memo") },
                memo_range.loc,
            );
        }

        /// Peek-only: at the `(` of a potential `(...)=>` arrow, is `=>` actually
        /// going to follow the matching `)`? Restores the lexer before returning.
        /// Used to disambiguate `memo (x) => x` (arrow) from `memo(5)` (call).
        fn isArrowParenForm(p: *P) bool {
            const saved = p.lexer;
            defer p.lexer.restore(&saved);
            // Paren-depth only. Braces and brackets inside arg lists (destructures,
            // object/array defaults) don't affect whether the outer `)` closes the
            // arg list, because they must be balanced by the inner parser anyway.
            p.lexer.next() catch return false;
            var depth: u32 = 1;
            while (depth > 0) {
                switch (p.lexer.token) {
                    .t_end_of_file, .t_syntax_error => return false,
                    .t_open_paren => depth += 1,
                    .t_close_paren => depth -= 1,
                    else => {},
                }
                p.lexer.next() catch return false;
            }
            return p.lexer.token == .t_equals_greater_than or
                (is_typescript_enabled and p.lexer.token == .t_colon);
        }

        fn wrapArrowAsMemo(p: *P, arrow_expr: Expr, memo_range: logger.Range) !Expr {
            const arrow = arrow_expr.data.e_arrow;
            const arity: f64 = blk: {
                if (arrow.has_rest_arg) break :blk 2;
                if (arrow.args.len == 0) break :blk 0;
                if (arrow.args.len == 1) break :blk 1;
                break :blk 2;
            };
            const memo_args = bun.handleOom(p.allocator.alloc(Expr, 2));
            memo_args[0] = arrow_expr;
            memo_args[1] = p.newExpr(E.Number{ .value = arity }, memo_range.loc);
            return p.callRuntime(memo_range.loc, "__parabunMemo", memo_args);
        }

        // Parabun: parse `parallel { key: EXPR, … }` and lower to
        //   Promise.all([EXPR, …]).then(([__pb0, …]) => ({ key: __pb0, … }))
        //
        // Body is parsed as a single object literal — string/identifier
        // keys with expression values. Spreads, computed keys, methods,
        // get/set, and shorthand are rejected (they'd all expand the
        // semantics in ways that need their own design).
        //
        // At entry: `parallel` has been consumed; p.lexer is on the `{`.
        pub fn parseParallelObjectExpr(p: *P, parallel_range: logger.Range) !Expr {
            try p.lexer.expect(.t_open_brace);

            // Allow "in" inside the body (it parses as a single object literal).
            const old_allow_in = p.allow_in;
            p.allow_in = true;
            defer p.allow_in = old_allow_in;

            var keys = ListManaged(Expr).init(p.allocator);
            var values = ListManaged(Expr).init(p.allocator);

            while (p.lexer.token != .t_close_brace) {
                // Reject spread — `{...rest}` semantics inside parallel
                // would require a runtime spread of a promise array, which
                // isn't part of the surface design.
                if (p.lexer.token == .t_dot_dot_dot) {
                    try p.log.addRangeError(p.source, p.lexer.range(), "spread is not allowed in `parallel` blocks");
                    return error.SyntaxError;
                }
                // Reject computed keys for the same reason — the lowering
                // emits a static key in the object literal; a `[expr]` key
                // would need more thought.
                if (p.lexer.token == .t_open_bracket) {
                    try p.log.addRangeError(p.source, p.lexer.range(), "computed keys are not allowed in `parallel` blocks");
                    return error.SyntaxError;
                }

                const key_loc = p.lexer.loc();
                const key_expr: Expr = switch (p.lexer.token) {
                    .t_identifier => blk: {
                        const ident = p.lexer.identifier;
                        try p.lexer.next();
                        // Identifier keys are emitted as PropertyName-shaped
                        // E.String nodes in object literals (the printer treats
                        // string-keyed props with valid-identifier names as
                        // bareword keys automatically).
                        break :blk p.newExpr(E.String{ .data = ident }, key_loc);
                    },
                    .t_string_literal, .t_no_substitution_template_literal => blk: {
                        const data = try p.lexer.toEString();
                        try p.lexer.next();
                        break :blk p.newExpr(E.String{ .data = data.slice8() }, key_loc);
                    },
                    .t_numeric_literal => blk: {
                        const num = p.newExpr(E.Number{ .value = p.lexer.number }, key_loc);
                        try p.lexer.next();
                        break :blk num;
                    },
                    else => {
                        try p.log.addRangeError(p.source, p.lexer.range(), "expected key in `parallel` block (identifier, string, or number)");
                        return error.SyntaxError;
                    },
                };

                try p.lexer.expect(.t_colon);
                const value_expr = try p.parseExpr(.comma);

                try keys.append(key_expr);
                try values.append(value_expr);

                if (p.lexer.token != .t_comma) break;
                try p.lexer.next();
            }

            try p.lexer.expect(.t_close_brace);

            // Build  Promise.all([v0, v1, ...])
            const promise_id = p.newExpr(E.Identifier{ .ref = try p.storeNameInRef("Promise") }, parallel_range.loc);
            const promise_all_dot = p.newExpr(E.Dot{
                .target = promise_id,
                .name = "all",
                .name_loc = parallel_range.loc,
            }, parallel_range.loc);
            const values_array = p.newExpr(E.Array{
                .items = js_ast.ExprNodeList.fromOwnedSlice(try values.toOwnedSlice()),
            }, parallel_range.loc);
            const promise_all_args = bun.handleOom(p.allocator.alloc(Expr, 1));
            promise_all_args[0] = values_array;
            const promise_all_call = p.newExpr(E.Call{
                .target = promise_all_dot,
                .args = js_ast.ExprNodeList.fromOwnedSlice(promise_all_args),
            }, parallel_range.loc);

            // Empty form: `parallel {}` resolves to `{}`.
            //   Promise.all([]).then(() => ({}))
            const arrow_loc = parallel_range.loc;
            const body_loc = logger.Loc{ .start = parallel_range.loc.start + 1 };

            // The synthesized arrow needs function_args + function_body
            // scopes for visit-pass loc lookup, mirroring the defer / arena
            // pattern. We push them, declare temp refs, and pop.
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_args, arrow_loc) catch bun.outOfMemory();
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_body, body_loc) catch bun.outOfMemory();

            // Build the destructured arg + the returned object.
            const n = keys.items.len;
            var args_slice: []G.Arg = &.{};
            var obj_expr: Expr = undefined;
            if (n == 0) {
                // No-arg arrow returning empty object literal.
                obj_expr = p.newExpr(E.Object{
                    .properties = G.Property.List{},
                }, body_loc);
            } else {
                // Declare __pb0 .. __pbN refs, build B.Array of identifiers,
                // and build the returned object literal whose value for each
                // key is the corresponding __pbN ref.
                const items = bun.handleOom(p.allocator.alloc(js_ast.ArrayBinding, n));
                const props = bun.handleOom(p.allocator.alloc(G.Property, n));
                for (0..n) |i| {
                    const tmp_name = bun.handleOom(std.fmt.allocPrint(p.allocator, "__pb{d}", .{i}));
                    const tmp_ref = try p.declareSymbol(.constant, body_loc, tmp_name);
                    items[i] = .{ .binding = p.b(B.Identifier{ .ref = tmp_ref }, body_loc) };
                    props[i] = .{
                        .key = keys.items[i],
                        .value = p.newExpr(E.Identifier{ .ref = tmp_ref }, body_loc),
                    };
                }
                const array_binding = p.b(B.Array{ .items = items, .has_spread = false, .is_single_line = true }, arrow_loc);
                args_slice = bun.handleOom(p.allocator.alloc(G.Arg, 1));
                args_slice[0] = .{ .binding = array_binding };
                obj_expr = p.newExpr(E.Object{
                    .properties = G.Property.List.fromOwnedSlice(props),
                }, body_loc);
            }

            // Arrow: ([__pb0, …]) => ({ k0: __pb0, … }) — single-expression
            // body via a return stmt with prefer_expr, parenthesizing the
            // object literal so it doesn't lex as a block.
            const arrow_stmts = bun.handleOom(p.allocator.alloc(Stmt, 1));
            arrow_stmts[0] = p.s(S.Return{ .value = obj_expr }, body_loc);
            const arrow_expr = p.newExpr(E.Arrow{
                .args = args_slice,
                .body = .{ .loc = body_loc, .stmts = arrow_stmts },
                .prefer_expr = true,
                .is_async = false,
            }, arrow_loc);

            p.popScope();
            p.popScope();

            // Build  promiseAllCall.then(arrow)
            const then_dot = p.newExpr(E.Dot{
                .target = promise_all_call,
                .name = "then",
                .name_loc = parallel_range.loc,
            }, parallel_range.loc);
            const then_args = bun.handleOom(p.allocator.alloc(Expr, 1));
            then_args[0] = arrow_expr;
            return p.newExpr(E.Call{
                .target = then_dot,
                .args = js_ast.ExprNodeList.fromOwnedSlice(then_args),
            }, parallel_range.loc);
        }

        // Parabun: parse a `schema { ... }` expression literal — an inline
        // JSON Schema body that desugars to `__paraFromSchema(() => ({ ... }))`
        // at the call site. The thunk wrap mirrors `model X = body` so
        // self/mutual recursion through the surrounding scope still works
        // (the thunk is invoked once at runtime, after the surrounding
        // bindings exist).
        //
        // At entry: `schema` has been consumed; p.lexer is on the `{`.
        pub fn parseSchemaObjectExpr(p: *P, schema_range: logger.Range) !Expr {
            const body_loc = p.lexer.loc();

            // Push function scopes so identifier refs in the body belong to
            // the synthesized arrow, not the outer scope. Without this the
            // visit pass would walk a Stmt whose contents were registered
            // to the wrong scope.
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_args, schema_range.loc) catch bun.outOfMemory();
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_body, body_loc) catch bun.outOfMemory();

            const old_fn_or_arrow_data = std.mem.toBytes(p.fn_or_arrow_data_parse);
            var arrow_data = p.fn_or_arrow_data_parse;
            arrow_data.allow_await = .allow_ident;
            arrow_data.allow_yield = .allow_ident;
            p.fn_or_arrow_data_parse = arrow_data;
            // `.comma` (not `.lowest`) so we stop AT the outer property
            // separator — the body is just the `{ ... }`, no sequence
            // continuations. Without this, `{ a: schema { ... }, b: ... }`
            // would have schema swallow the `, b: ...` as a sequence expr.
            const body_expr = try p.parseExpr(.comma);
            p.fn_or_arrow_data_parse = std.mem.bytesToValue(@TypeOf(p.fn_or_arrow_data_parse), &old_fn_or_arrow_data);

            const arrow_stmts = bun.handleOom(p.allocator.alloc(Stmt, 1));
            arrow_stmts[0] = p.s(S.Return{ .value = body_expr }, body_loc);
            const thunk = p.newExpr(E.Arrow{
                .args = &.{},
                .body = .{ .loc = body_loc, .stmts = arrow_stmts },
                .prefer_expr = true,
                .is_async = false,
            }, schema_range.loc);

            p.popScope();
            p.popScope();

            const args = bun.handleOom(p.allocator.alloc(Expr, 1));
            args[0] = thunk;
            return p.callRuntime(schema_range.loc, "__paraFromSchema", args);
        }

        // Parabun: parse a `match SUBJECT { pat => result, ... }` expression
        // and lower it to an IIFE wrapping a ternary chain:
        //
        //   match status {
        //     200 => "ok",
        //     400 | 404 => "client error",
        //     500 => "server error",
        //     _ => "unknown"
        //   }
        //
        // becomes
        //
        //   ((__pmN$) =>
        //     __pmN$ === 200 ? "ok"
        //     : (__pmN$ === 400 || __pmN$ === 404) ? "client error"
        //     : __pmN$ === 500 ? "server error"
        //     : "unknown"
        //   )(status)
        //
        // Patterns supported in this MVP:
        //   - Literal:           42, "ok", true, null, -3
        //   - Wildcard:          _   (always matches; must come last)
        //   - OR:                lit1 | lit2 | lit3
        //   - Identifier-bind:   n   (matches anything, binds to `n`)
        //
        // Each arm's result expression is parsed at .comma so a trailing
        // comma terminates the arm cleanly. The fallback when no arms match
        // (no wildcard / identifier-bind reached) is `undefined`.
        pub fn parseMatchExpr(p: *P, match_range: logger.Range) anyerror!Expr {
            // Parse the subject expression. parseExpr at .lowest stops at
            // `{` (which isn't an expression continuation) — we land
            // exactly at the open-brace of the arms block.
            const subject = try p.parseExpr(.lowest);

            try p.lexer.expect(.t_open_brace);

            // Synthesize an IIFE arrow whose param is the matched value.
            // Use a unique name via temp_ref_count.
            p.temp_ref_count += 1;
            const counter = p.temp_ref_count;
            const m_name = bun.handleOom(std.fmt.allocPrint(p.allocator, "__pm_{x}$", .{counter}));

            // Push the arrow's scopes at fresh locs (lexer.loc is just past
            // `{` — strictly later than any scope pushed during subject
            // parsing, satisfying pushScopeForParsePass's monotonic check).
            const args_loc = match_range.loc;
            const body_loc = logger.Loc{ .start = args_loc.start + 1 };

            _ = try p.pushScopeForParsePass(js_ast.Scope.Kind.function_args, args_loc);
            const m_ref = try p.declareSymbol(.hoisted, args_loc, m_name);
            _ = try p.pushScopeForParsePass(js_ast.Scope.Kind.function_body, body_loc);

            // Push the block scope that will wrap the arrow body BEFORE
            // arm parsing, and keep it as the current scope while arms
            // are parsed. Two reasons:
            //
            //  1. visit's `s_switch` / `s_block` handler always pushes
            //     this block right after function_body. If we delayed
            //     the push until after arms, a nested `match` inside an
            //     arm RHS would inject its own scopes BETWEEN body and
            //     block at parse-time, while visit-time still expects
            //     block to come next — the queue order diverges and
            //     visit panics with "Scope mismatch while visiting".
            //
            //  2. Inner scopes pushed during arm parsing must have
            //     their `parent` set to THIS block (not function_body)
            //     so that visit-time `popScope` walks back through the
            //     same chain visit pushed. Keeping the block current
            //     during arm parsing makes inner-arm scopes child of
            //     block, matching the visit-side stack.
            //
            // The arrow body is always wrapped in a block (S.Switch for
            // the switch lowering, S.Block wrapping the ternary return
            // for the ternary lowering) so visit consumes the scope
            // either way.
            const switch_body_loc = logger.Loc{ .start = args_loc.start + 2 };
            _ = try p.pushScopeForParsePass(js_ast.Scope.Kind.block, switch_body_loc);

            // Collect arms: each is { test_expr | null = wildcard, result }.
            // The test for an OR / literal pattern is `__pm === lit` (chained
            // with || for OR). The wildcard / identifier-bind arms have no
            // test (they always match).
            // Each arm tracks both forms so we can decide at the end
            // which lowering to emit:
            //   ternary chain — universal, used when any arm has a binding,
            //                   constructor pattern, or other non-switchable
            //                   shape.
            //   switch        — used when every arm is either literal-only
            //                   (with optional OR alternatives) or a
            //                   wildcard. JS engines compile dense integer
            //                   switches to jump tables.
            const Arm = struct {
                test_expr: ?Expr, // for ternary path; null = catch-all
                result: Expr,
                // `literals` is non-null when the arm's pattern was purely
                // literal(s) — its values are usable as switch case labels.
                // null for wildcard / bind / constructor patterns.
                literals: ?[]Expr,
                is_wildcard: bool,
                // `tag` is non-null for Result/Option constructor patterns
                // (Ok/Err/Some/None). When every arm has a tag (or is
                // wildcard), we can switch on `__pm.tag` instead of a
                // ternary chain.
                tag: ?[]const u8,
            };
            var arms = ListManaged(Arm).init(p.allocator);

            while (p.lexer.token != .t_close_brace) {
                // Parse a single pattern (with optional OR alternatives).
                var test_expr: ?Expr = null;
                var bind_name: ?[]const u8 = null;

                // What kind of identifier should be substituted in the
                // arm result post-parse, and to what value:
                //   ident-bind:  bind_name → __pm
                //   Ok(x)/Some(x): bind_name → __pm.value
                //   Err(e):       bind_name → __pm.error
                //   None / _ / lit: no substitution
                const SubKind = enum { none, plain, dot_value, dot_error };
                var sub_kind: SubKind = .none;
                var literals: ?[]Expr = null;
                var is_wildcard = false;
                var tag: ?[]const u8 = null;

                // Wildcard `_` — possibly followed by `is Type` for a
                // type-guard arm.
                if (p.lexer.token == .t_identifier and bun.strings.eqlComptime(p.lexer.raw(), "_")) {
                    try p.lexer.next();
                    // `_ is Type` / `_ is not Type` — runtime type-guard arm.
                    if (p.lexer.token == .t_identifier and bun.strings.eqlComptime(p.lexer.raw(), "is") and !p.lexer.has_newline_before) {
                        try p.lexer.next();
                        var negate = false;
                        if (p.lexer.token == .t_identifier and bun.strings.eqlComptime(p.lexer.raw(), "not")) {
                            negate = true;
                            try p.lexer.next();
                        }
                        if (p.lexer.token == .t_identifier and p.lexer.raw().len > 0 and p.lexer.raw()[0] >= 'A' and p.lexer.raw()[0] <= 'Z') {
                            const type_name = p.lexer.identifier;
                            const type_loc = p.lexer.loc();
                            try p.lexer.next();
                            const type_ref = p.storeNameInRef(type_name) catch unreachable;
                            const parse_dot = p.newExpr(E.Dot{
                                .target = p.newExpr(E.Identifier{ .ref = type_ref }, type_loc),
                                .name = "parse",
                                .name_loc = type_loc,
                            }, type_loc);
                            const call_args = bun.handleOom(p.allocator.alloc(Expr, 1));
                            call_args[0] = p.newExpr(E.Identifier{ .ref = m_ref }, args_loc);
                            const parse_call = p.newExpr(E.Call{
                                .target = parse_dot,
                                .args = js_ast.ExprNodeList.fromOwnedSlice(call_args),
                            }, type_loc);
                            const tag_dot = p.newExpr(E.Dot{
                                .target = parse_call,
                                .name = "tag",
                                .name_loc = type_loc,
                            }, type_loc);
                            test_expr = p.newExpr(E.Binary{
                                .op = if (negate) .bin_strict_ne else .bin_strict_eq,
                                .left = tag_dot,
                                .right = p.newExpr(E.String{ .data = "Ok" }, type_loc),
                            }, type_loc);
                        } else {
                            // No type after `is` — bare `_ is` is meaningless,
                            // fall back to wildcard.
                            is_wildcard = true;
                        }
                    } else {
                        is_wildcard = true;
                    }
                }
                // Result / Option constructor patterns.
                else if (p.lexer.token == .t_identifier and bun.strings.eqlComptime(p.lexer.raw(), "Ok")) {
                    try p.lexer.next();
                    test_expr = buildTagTestExpr(p, m_ref, args_loc, "Ok");
                    tag = "Ok";
                    if (try parseCtorArgIdent(p)) |bn| {
                        bind_name = bn;
                        sub_kind = .dot_value;
                    }
                } else if (p.lexer.token == .t_identifier and bun.strings.eqlComptime(p.lexer.raw(), "Some")) {
                    try p.lexer.next();
                    test_expr = buildTagTestExpr(p, m_ref, args_loc, "Some");
                    tag = "Some";
                    if (try parseCtorArgIdent(p)) |bn| {
                        bind_name = bn;
                        sub_kind = .dot_value;
                    }
                } else if (p.lexer.token == .t_identifier and bun.strings.eqlComptime(p.lexer.raw(), "Err")) {
                    try p.lexer.next();
                    test_expr = buildTagTestExpr(p, m_ref, args_loc, "Err");
                    tag = "Err";
                    if (try parseCtorArgIdent(p)) |bn| {
                        bind_name = bn;
                        sub_kind = .dot_error;
                    }
                } else if (p.lexer.token == .t_identifier and bun.strings.eqlComptime(p.lexer.raw(), "None")) {
                    try p.lexer.next();
                    test_expr = buildTagTestExpr(p, m_ref, args_loc, "None");
                    tag = "None";
                } else if (p.lexer.token == .t_identifier) {
                    // Identifier-bind: `n => n + 1`. Optionally followed by
                    // `is Type` / `is not Type` for a binding type-guard:
                    // `u is User => u.email`.
                    bind_name = p.lexer.identifier;
                    sub_kind = .plain;
                    try p.lexer.next();
                    if (p.lexer.token == .t_identifier and bun.strings.eqlComptime(p.lexer.raw(), "is") and !p.lexer.has_newline_before) {
                        try p.lexer.next();
                        var negate = false;
                        if (p.lexer.token == .t_identifier and bun.strings.eqlComptime(p.lexer.raw(), "not")) {
                            negate = true;
                            try p.lexer.next();
                        }
                        if (p.lexer.token == .t_identifier and p.lexer.raw().len > 0 and p.lexer.raw()[0] >= 'A' and p.lexer.raw()[0] <= 'Z') {
                            const type_name = p.lexer.identifier;
                            const type_loc = p.lexer.loc();
                            try p.lexer.next();
                            const type_ref = p.storeNameInRef(type_name) catch unreachable;
                            const parse_dot = p.newExpr(E.Dot{
                                .target = p.newExpr(E.Identifier{ .ref = type_ref }, type_loc),
                                .name = "parse",
                                .name_loc = type_loc,
                            }, type_loc);
                            const call_args = bun.handleOom(p.allocator.alloc(Expr, 1));
                            call_args[0] = p.newExpr(E.Identifier{ .ref = m_ref }, args_loc);
                            const parse_call = p.newExpr(E.Call{
                                .target = parse_dot,
                                .args = js_ast.ExprNodeList.fromOwnedSlice(call_args),
                            }, type_loc);
                            const tag_dot = p.newExpr(E.Dot{
                                .target = parse_call,
                                .name = "tag",
                                .name_loc = type_loc,
                            }, type_loc);
                            test_expr = p.newExpr(E.Binary{
                                .op = if (negate) .bin_strict_ne else .bin_strict_eq,
                                .left = tag_dot,
                                .right = p.newExpr(E.String{ .data = "Ok" }, type_loc),
                            }, type_loc);
                        }
                    }
                } else {
                    // Literal pattern (with possible OR chain). Capture
                    // the raw lit values too — if every arm in the match
                    // turns out to be literal-only, we'll lower to a
                    // switch instead of a ternary chain.
                    var lits = ListManaged(Expr).init(p.allocator);
                    test_expr = try buildArmTestForLiteralCollecting(p, m_ref, args_loc, &lits);
                    literals = bun.handleOom(lits.toOwnedSlice());
                }

                try p.lexer.expect(.t_equals_greater_than);

                var result_expr = try p.parseExpr(.comma);

                // Apply substitution for binding patterns.
                if (bind_name) |bname| {
                    const replacement: Expr = switch (sub_kind) {
                        .plain => p.newExpr(E.Identifier{ .ref = m_ref }, args_loc),
                        .dot_value => p.newExpr(E.Dot{
                            .target = p.newExpr(E.Identifier{ .ref = m_ref }, args_loc),
                            .name = "value",
                            .name_loc = args_loc,
                        }, args_loc),
                        .dot_error => p.newExpr(E.Dot{
                            .target = p.newExpr(E.Identifier{ .ref = m_ref }, args_loc),
                            .name = "error",
                            .name_loc = args_loc,
                        }, args_loc),
                        .none => p.newExpr(E.Undefined{}, args_loc),
                    };
                    if (substituteIdentifierByName(p, result_expr, bname, replacement)) |substituted| {
                        result_expr = substituted;
                    }
                }

                bun.handleOom(arms.append(.{
                    .test_expr = test_expr,
                    .result = result_expr,
                    .literals = literals,
                    .is_wildcard = is_wildcard,
                    .tag = tag,
                }));

                if (p.lexer.token == .t_comma) {
                    try p.lexer.next();
                } else {
                    break;
                }
            }

            try p.lexer.expect(.t_close_brace);

            // Decide lowering. Three options:
            //   literal-switch — every arm is literal-only or wildcard.
            //                    Switch on `__pm`. Dense ints get jump
            //                    tables.
            //   tag-switch     — every arm is a Result/Option ctor (Ok,
            //                    Err, Some, None) or wildcard. Switch on
            //                    `__pm.tag`. String switches still
            //                    optimize well in V8/JSC.
            //   ternary        — anything else (bindings, mixed shapes).
            var all_literal = true;
            var all_tag = true;
            var saw_tag = false;
            for (arms.items) |arm| {
                if (!arm.is_wildcard and arm.literals == null) all_literal = false;
                if (!arm.is_wildcard and arm.tag == null) all_tag = false;
                if (arm.tag != null) saw_tag = true;
            }
            if (!saw_tag) all_tag = false; // all-wildcard or all-literal: don't claim tag mode

            p.popScope();
            p.popScope();
            p.popScope();

            const arrow_body_stmts = bun.handleOom(p.allocator.alloc(Stmt, 1));
            if (all_literal) {
                arrow_body_stmts[0] = buildMatchSwitchStmt(p, m_ref, args_loc, switch_body_loc, arms.items) catch return error.SyntaxError;
            } else if (all_tag) {
                arrow_body_stmts[0] = buildMatchTagSwitchStmt(p, m_ref, args_loc, switch_body_loc, arms.items) catch return error.SyntaxError;
            } else {
                // Ternary chain — right-to-left, fallback = first catch-all's
                // result or `undefined`. Wrapped in an S.Block at
                // switch_body_loc so that visit's `s_block` handler
                // consumes the block scope we pushed at parse-time
                // (which inner-arm scopes parent into). Without this
                // wrap, the block scope would have no visit-time
                // consumer for the ternary path and balance breaks.
                var fallback: Expr = p.newExpr(E.Undefined{}, args_loc);
                var first_test_idx: usize = arms.items.len;
                for (arms.items, 0..) |arm, i| {
                    if (arm.test_expr == null) {
                        fallback = arm.result;
                        first_test_idx = i;
                        break;
                    }
                }
                var chain: Expr = fallback;
                var i = first_test_idx;
                while (i > 0) {
                    i -= 1;
                    const arm = arms.items[i];
                    chain = p.newExpr(E.If{
                        .test_ = arm.test_expr.?,
                        .yes = arm.result,
                        .no = chain,
                    }, args_loc);
                }
                const ternary_stmts = bun.handleOom(p.allocator.alloc(Stmt, 1));
                ternary_stmts[0] = p.s(S.Return{ .value = chain }, switch_body_loc);
                arrow_body_stmts[0] = p.s(S.Block{ .stmts = ternary_stmts }, switch_body_loc);
            }

            // Wrap in ((__pm) => body)(subject).
            const arrow_args = bun.handleOom(p.allocator.alloc(G.Arg, 1));
            arrow_args[0] = .{ .binding = p.b(B.Identifier{ .ref = m_ref }, args_loc) };
            const arrow = p.newExpr(E.Arrow{
                .args = arrow_args,
                .body = .{ .loc = body_loc, .stmts = arrow_body_stmts },
                // Body is always a block-style statement (S.Switch or
                // S.Block wrapping S.Return) — never a single
                // expression — so the arrow always prints braces.
                .prefer_expr = false,
                .is_async = false,
            }, args_loc);
            const call_args2 = bun.handleOom(p.allocator.alloc(Expr, 1));
            call_args2[0] = subject;
            return p.newExpr(E.Call{
                .target = arrow,
                .args = js_ast.ExprNodeList.fromOwnedSlice(call_args2),
            }, args_loc);
        }

        // Parabun: build a Result / Option constructor object literal.
        // Called for `Ok(x)` / `Err(e)` / `Some(x)`. Caller has already
        // consumed the constructor name; lexer is at `(`.
        pub fn parseResultCtor(p: *P, comptime tag_name: string, comptime value_key: string, loc: logger.Loc) anyerror!Expr {
            try p.lexer.expect(.t_open_paren);
            const value = try p.parseExpr(.comma);
            try p.lexer.expect(.t_close_paren);

            const properties = bun.handleOom(p.allocator.alloc(G.Property, 2));
            properties[0] = .{
                .key = p.newExpr(E.String{ .data = "tag" }, loc),
                .value = p.newExpr(E.String{ .data = tag_name }, loc),
            };
            properties[1] = .{
                .key = p.newExpr(E.String{ .data = value_key }, loc),
                .value = value,
            };
            return p.newExpr(E.Object{
                .properties = G.Property.List.fromOwnedSlice(properties),
            }, loc);
        }

        // Parabun: build the None literal object — `{ tag: "None" }`.
        pub fn parseNoneLiteral(p: *P, loc: logger.Loc) anyerror!Expr {
            const properties = bun.handleOom(p.allocator.alloc(G.Property, 1));
            properties[0] = .{
                .key = p.newExpr(E.String{ .data = "tag" }, loc),
                .value = p.newExpr(E.String{ .data = "None" }, loc),
            };
            return p.newExpr(E.Object{
                .properties = G.Property.List.fromOwnedSlice(properties),
            }, loc);
        }

        // Helper: substitute every occurrence of identifier `name` in
        // `expr` with `replacement` (typically the match subject ref).
        // Handles the common shapes that show up in match-arm result
        // expressions; bails (returns null) on anything unsupported, which
        // leaves the original `name` reference in place — visit will then
        // fail to resolve it, surfacing a clean compile error.
        fn substituteIdentifierByName(p: *P, expr: Expr, name: []const u8, replacement: Expr) ?Expr {
            return switch (expr.data) {
                .e_identifier => |id| if (bun.strings.eql(p.loadNameFromRef(id.ref), name)) replacement else expr,
                .e_number, .e_string, .e_null, .e_undefined, .e_missing, .e_boolean => expr,
                .e_binary => |bin| blk: {
                    const new_left = substituteIdentifierByName(p, bin.left, name, replacement) orelse break :blk null;
                    const new_right = substituteIdentifierByName(p, bin.right, name, replacement) orelse break :blk null;
                    break :blk Expr.init(E.Binary, .{
                        .op = bin.op,
                        .left = new_left,
                        .right = new_right,
                    }, expr.loc);
                },
                .e_unary => |un| blk: {
                    const new_val = substituteIdentifierByName(p, un.value, name, replacement) orelse break :blk null;
                    break :blk Expr.init(E.Unary, .{
                        .op = un.op,
                        .value = new_val,
                    }, expr.loc);
                },
                .e_dot => |dot| blk: {
                    const new_target = substituteIdentifierByName(p, dot.target, name, replacement) orelse break :blk null;
                    break :blk Expr.init(E.Dot, .{
                        .target = new_target,
                        .name = dot.name,
                        .name_loc = dot.name_loc,
                    }, expr.loc);
                },
                .e_index => |idx| blk: {
                    const new_target = substituteIdentifierByName(p, idx.target, name, replacement) orelse break :blk null;
                    const new_index = substituteIdentifierByName(p, idx.index, name, replacement) orelse break :blk null;
                    break :blk Expr.init(E.Index, .{
                        .target = new_target,
                        .index = new_index,
                    }, expr.loc);
                },
                .e_call => |call| blk: {
                    const new_target = substituteIdentifierByName(p, call.target, name, replacement) orelse break :blk null;
                    const new_args = p.allocator.alloc(Expr, call.args.len) catch break :blk null;
                    for (call.args.slice(), 0..) |arg, i| {
                        new_args[i] = substituteIdentifierByName(p, arg, name, replacement) orelse break :blk null;
                    }
                    break :blk Expr.init(E.Call, .{
                        .target = new_target,
                        .args = js_ast.ExprNodeList.fromOwnedSlice(new_args),
                        .close_paren_loc = call.close_paren_loc,
                    }, expr.loc);
                },
                .e_if => |cond| blk: {
                    const new_test = substituteIdentifierByName(p, cond.test_, name, replacement) orelse break :blk null;
                    const new_yes = substituteIdentifierByName(p, cond.yes, name, replacement) orelse break :blk null;
                    const new_no = substituteIdentifierByName(p, cond.no, name, replacement) orelse break :blk null;
                    break :blk Expr.init(E.If, .{
                        .test_ = new_test,
                        .yes = new_yes,
                        .no = new_no,
                    }, expr.loc);
                },
                else => null,
            };
        }

        // Build `__pm.tag === "<tag>"` for a Result / Option pattern.
        fn buildTagTestExpr(p: *P, m_ref: js_ast.Ref, m_loc: logger.Loc, comptime tag_name: string) Expr {
            const tag_access = p.newExpr(E.Dot{
                .target = p.newExpr(E.Identifier{ .ref = m_ref }, m_loc),
                .name = "tag",
                .name_loc = m_loc,
            }, m_loc);
            return p.newExpr(E.Binary{
                .op = .bin_strict_eq,
                .left = tag_access,
                .right = p.newExpr(E.String{ .data = tag_name }, m_loc),
            }, m_loc);
        }

        // Parse the argument of a constructor pattern: `Ok(name)` /
        // `Ok(_)` / `Ok` (no parens — match-tag-only). Returns the bound
        // name on identifier; null on `_` or no-parens.
        fn parseCtorArgIdent(p: *P) anyerror!?[]const u8 {
            if (p.lexer.token != .t_open_paren) return null;
            try p.lexer.next();
            var name: ?[]const u8 = null;
            if (p.lexer.token == .t_identifier) {
                if (!bun.strings.eqlComptime(p.lexer.raw(), "_")) {
                    name = p.lexer.identifier;
                }
                try p.lexer.next();
            }
            try p.lexer.expect(.t_close_paren);
            return name;
        }

        // Build `switch (__pm.tag) { case "Ok": ... }` for arms that are
        // all Result/Option constructor patterns (Ok / Err / Some / None)
        // or a wildcard. Each arm's body is a single `return result;`.
        // Result expressions have already had their bind names substituted
        // (`user` → `__pm.value`, `e` → `__pm.error`) during arm parse.
        fn buildMatchTagSwitchStmt(
            p: *P,
            m_ref: js_ast.Ref,
            m_loc: logger.Loc,
            body_loc: logger.Loc,
            arms: anytype,
        ) anyerror!Stmt {
            var cases = ListManaged(js_ast.Case).init(p.allocator);
            for (arms) |arm| {
                const body = bun.handleOom(p.allocator.alloc(Stmt, 1));
                body[0] = p.s(S.Return{ .value = arm.result }, body_loc);
                if (arm.is_wildcard) {
                    bun.handleOom(cases.append(.{
                        .loc = body_loc,
                        .value = null,
                        .body = body,
                    }));
                } else {
                    bun.handleOom(cases.append(.{
                        .loc = body_loc,
                        .value = p.newExpr(E.String{ .data = arm.tag.? }, m_loc),
                        .body = body,
                    }));
                }
            }
            const tag_access = p.newExpr(E.Dot{
                .target = p.newExpr(E.Identifier{ .ref = m_ref }, m_loc),
                .name = "tag",
                .name_loc = m_loc,
            }, m_loc);
            return p.s(S.Switch{
                .test_ = tag_access,
                .body_loc = body_loc,
                .cases = bun.handleOom(cases.toOwnedSlice()),
            }, body_loc);
        }

        // Build a `switch (__pm) { ... }` statement covering all arms.
        // For an OR pattern (`400 | 404 => result`), emit one `case` label
        // per literal — the first ones with empty bodies fall through to
        // the last, which has the `return result;` body. The wildcard
        // becomes `default:`. Subject is already bound to m_ref by the
        // surrounding IIFE arrow.
        fn buildMatchSwitchStmt(
            p: *P,
            m_ref: js_ast.Ref,
            m_loc: logger.Loc,
            body_loc: logger.Loc,
            arms: anytype,
        ) anyerror!Stmt {
            var cases = ListManaged(js_ast.Case).init(p.allocator);
            for (arms) |arm| {
                if (arm.is_wildcard) {
                    const body = bun.handleOom(p.allocator.alloc(Stmt, 1));
                    body[0] = p.s(S.Return{ .value = arm.result }, body_loc);
                    bun.handleOom(cases.append(.{
                        .loc = body_loc,
                        .value = null, // null = default
                        .body = body,
                    }));
                    continue;
                }
                const lits = arm.literals.?;
                // For N OR alternatives, emit N case labels. The first
                // N-1 have empty bodies (fall-through into the next case),
                // the last has the return.
                for (lits, 0..) |lit, i| {
                    if (i < lits.len - 1) {
                        bun.handleOom(cases.append(.{
                            .loc = body_loc,
                            .value = lit,
                            .body = &[_]Stmt{},
                        }));
                    } else {
                        const body = bun.handleOom(p.allocator.alloc(Stmt, 1));
                        body[0] = p.s(S.Return{ .value = arm.result }, body_loc);
                        bun.handleOom(cases.append(.{
                            .loc = body_loc,
                            .value = lit,
                            .body = body,
                        }));
                    }
                }
            }
            return p.s(S.Switch{
                .test_ = p.newExpr(E.Identifier{ .ref = m_ref }, m_loc),
                .body_loc = body_loc,
                .cases = bun.handleOom(cases.toOwnedSlice()),
            }, body_loc);
        }

        // Parse a literal pattern (with optional OR chain) and return the
        // test expression `__pm === lit (|| __pm === lit2)*`. Also appends
        // each literal expression to `lits_out` so the caller can use them
        // as switch case labels if the whole match turns out to be
        // switchable.
        fn buildArmTestForLiteralCollecting(
            p: *P,
            m_ref: js_ast.Ref,
            m_loc: logger.Loc,
            lits_out: *ListManaged(Expr),
        ) anyerror!Expr {
            const first = try p.parseExpr(.bitwise_or);
            bun.handleOom(lits_out.append(first));
            var test_expr = p.newExpr(E.Binary{
                .op = .bin_strict_eq,
                .left = p.newExpr(E.Identifier{ .ref = m_ref }, m_loc),
                .right = first,
            }, m_loc);

            while (p.lexer.token == .t_bar) {
                try p.lexer.next();
                const next_pat = try p.parseExpr(.bitwise_or);
                bun.handleOom(lits_out.append(next_pat));
                const next_test = p.newExpr(E.Binary{
                    .op = .bin_strict_eq,
                    .left = p.newExpr(E.Identifier{ .ref = m_ref }, m_loc),
                    .right = next_pat,
                }, m_loc);
                test_expr = p.newExpr(E.Binary{
                    .op = .bin_logical_or,
                    .left = test_expr,
                    .right = next_test,
                }, m_loc);
            }

            return test_expr;
        }
    };
}

const string = []const u8;

const bun = @import("bun");
const Environment = bun.Environment;
const assert = bun.assert;
const logger = bun.logger;
const strings = bun.strings;

const js_ast = bun.ast;
const B = js_ast.B;
const Binding = js_ast.Binding;
const E = js_ast.E;
const Expr = js_ast.Expr;
const ExprNodeIndex = js_ast.ExprNodeIndex;
const ExprNodeList = js_ast.ExprNodeList;
const Flags = js_ast.Flags;
const LocRef = js_ast.LocRef;
const S = js_ast.S;
const Stmt = js_ast.Stmt;
const Symbol = js_ast.Symbol;

const G = js_ast.G;
const Arg = G.Arg;
const Decl = G.Decl;
const Property = G.Property;

const Op = js_ast.Op;
const Level = js_ast.Op.Level;

const js_lexer = bun.js_lexer;
const T = js_lexer.T;

const js_parser = bun.js_parser;
const AwaitOrYield = js_parser.AwaitOrYield;
const DeferredArrowArgErrors = js_parser.DeferredArrowArgErrors;
const DeferredErrors = js_parser.DeferredErrors;
const ExprListLoc = js_parser.ExprListLoc;
const ExprOrLetStmt = js_parser.ExprOrLetStmt;
const FnOrArrowDataParse = js_parser.FnOrArrowDataParse;
const JSXTransformType = js_parser.JSXTransformType;
const LocList = js_parser.LocList;
const ParenExprOpts = js_parser.ParenExprOpts;
const ParseBindingOptions = js_parser.ParseBindingOptions;
const ParseClassOptions = js_parser.ParseClassOptions;
const ParseStatementOptions = js_parser.ParseStatementOptions;
const ParsedPath = js_parser.ParsedPath;
const Prefill = js_parser.Prefill;
const PropertyOpts = js_parser.PropertyOpts;
const StmtList = js_parser.StmtList;
const TypeScript = js_parser.TypeScript;
const options = js_parser.options;

const std = @import("std");
const List = std.ArrayListUnmanaged;
const ListManaged = std.array_list.Managed;
