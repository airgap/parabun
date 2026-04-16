pub fn ParseSuffix(
    comptime parser_feature__typescript: bool,
    comptime parser_feature__jsx: JSXTransformType,
    comptime parser_feature__scan_only: bool,
) type {
    return struct {
        const P = js_parser.NewParser_(parser_feature__typescript, parser_feature__jsx, parser_feature__scan_only);
        const is_typescript_enabled = P.is_typescript_enabled;

        fn handleTypescriptAs(p: *P, level: Level) anyerror!Continuation {
            if (is_typescript_enabled and level.lt(.compare) and !p.lexer.has_newline_before and (p.lexer.isContextualKeyword("as") or p.lexer.isContextualKeyword("satisfies"))) {
                try p.lexer.next();
                try p.skipTypeScriptType(.lowest);

                // These tokens are not allowed to follow a cast expression. This isn't
                // an outright error because it may be on a new line, in which case it's
                // the start of a new expression when it's after a cast:
                //
                //   x = y as z
                //   (something);
                //
                switch (p.lexer.token) {
                    .t_plus_plus,
                    .t_minus_minus,
                    .t_no_substitution_template_literal,
                    .t_template_head,
                    .t_open_paren,
                    .t_open_bracket,
                    .t_question_dot,
                    => {
                        p.forbid_suffix_after_as_loc = p.lexer.loc();
                        return .done;
                    },
                    else => {},
                }

                if (p.lexer.token.isAssign()) {
                    p.forbid_suffix_after_as_loc = p.lexer.loc();
                    return .done;
                }
                return .next;
            }
            return .done;
        }

        fn t_dot(p: *P, optional_chain: *?OptionalChain, old_optional_chain: ?OptionalChain, left: *Expr) anyerror!Continuation {
            try p.lexer.next();
            const target = left.*;

            if (p.lexer.token == .t_private_identifier and p.allow_private_identifiers) {
                // "a.#b"
                // "a?.b.#c"
                switch (left.data) {
                    .e_super => {
                        try p.lexer.expected(.t_identifier);
                    },
                    else => {},
                }

                const name = p.lexer.identifier;
                const name_loc = p.lexer.loc();
                try p.lexer.next();
                const ref = p.storeNameInRef(name) catch unreachable;
                left.* = p.newExpr(E.Index{
                    .target = target,
                    .index = p.newExpr(
                        E.PrivateIdentifier{
                            .ref = ref,
                        },
                        name_loc,
                    ),
                    .optional_chain = old_optional_chain,
                }, left.loc);
            } else {
                // "a.b"
                // "a?.b.c"
                if (!p.lexer.isIdentifierOrKeyword()) {
                    try p.lexer.expect(.t_identifier);
                }

                const name = p.lexer.identifier;
                const name_loc = p.lexer.loc();
                const name_range = p.lexer.range();
                try p.lexer.next();

                // Parabun: reject impure member accesses inside pure functions
                if (p.fn_or_arrow_data_parse.is_pure) {
                    if (target.data == .e_identifier) {
                        const target_name = p.loadNameFromRef(target.data.e_identifier.ref);
                        if (js_parser.isImpureMemberAccess(target_name, name)) {
                            p.log.addRangeErrorFmt(p.source, name_range, p.allocator, "Cannot reference impure \"{s}.{s}\" inside a pure function", .{ target_name, name }) catch unreachable;
                        }
                    }
                }

                left.* = p.newExpr(
                    E.Dot{
                        .target = target,
                        .name = name,
                        .name_loc = name_loc,
                        .optional_chain = old_optional_chain,
                    },
                    left.loc,
                );
            }
            optional_chain.* = old_optional_chain;
            return .next;
        }
        fn t_question_dot(p: *P, level: Level, optional_chain: *?OptionalChain, left: *Expr) anyerror!Continuation {
            try p.lexer.next();
            var optional_start: ?OptionalChain = OptionalChain.start;

            // Remove unnecessary optional chains
            if (p.options.features.minify_syntax) {
                const result = SideEffects.toNullOrUndefined(p, left.data);
                if (result.ok and !result.value) {
                    optional_start = null;
                }
            }

            switch (p.lexer.token) {
                .t_open_bracket => {
                    // "a?.[b]"
                    try p.lexer.next();

                    // allow "in" inside the brackets;
                    const old_allow_in = p.allow_in;
                    p.allow_in = true;

                    const index = try p.parseExpr(.lowest);

                    p.allow_in = old_allow_in;

                    try p.lexer.expect(.t_close_bracket);
                    left.* = p.newExpr(
                        E.Index{ .target = left.*, .index = index, .optional_chain = optional_start },
                        left.loc,
                    );
                },

                .t_open_paren => {
                    // "a?.()"
                    if (level.gte(.call)) {
                        return .done;
                    }

                    const list_loc = try p.parseCallArgs();
                    left.* = p.newExpr(E.Call{
                        .target = left.*,
                        .args = list_loc.list,
                        .close_paren_loc = list_loc.loc,
                        .optional_chain = optional_start,
                    }, left.loc);
                },
                .t_less_than, .t_less_than_less_than => {
                    // "a?.<T>()"
                    if (comptime !is_typescript_enabled) {
                        try p.lexer.expected(.t_identifier);
                        return error.SyntaxError;
                    }

                    _ = try p.skipTypeScriptTypeArguments(false);
                    if (p.lexer.token != .t_open_paren) {
                        try p.lexer.expected(.t_open_paren);
                    }

                    if (level.gte(.call)) {
                        return .done;
                    }

                    const list_loc = try p.parseCallArgs();
                    left.* = p.newExpr(E.Call{
                        .target = left.*,
                        .args = list_loc.list,
                        .close_paren_loc = list_loc.loc,
                        .optional_chain = optional_start,
                    }, left.loc);
                },
                else => {
                    if (p.lexer.token == .t_private_identifier and p.allow_private_identifiers) {
                        // "a?.#b"
                        const name = p.lexer.identifier;
                        const name_loc = p.lexer.loc();
                        try p.lexer.next();
                        const ref = p.storeNameInRef(name) catch unreachable;
                        left.* = p.newExpr(E.Index{
                            .target = left.*,
                            .index = p.newExpr(
                                E.PrivateIdentifier{
                                    .ref = ref,
                                },
                                name_loc,
                            ),
                            .optional_chain = optional_start,
                        }, left.loc);
                    } else {
                        // "a?.b"
                        if (!p.lexer.isIdentifierOrKeyword()) {
                            try p.lexer.expect(.t_identifier);
                        }
                        const name = p.lexer.identifier;
                        const name_loc = p.lexer.loc();
                        try p.lexer.next();

                        left.* = p.newExpr(E.Dot{
                            .target = left.*,
                            .name = name,
                            .name_loc = name_loc,
                            .optional_chain = optional_start,
                        }, left.loc);
                    }
                },
            }

            // Only continue if we have started
            if ((optional_start orelse .continuation) == .start) {
                optional_chain.* = .continuation;
            }

            return .next;
        }
        fn t_no_substitution_template_literal(p: *P, _: Level, _: *?OptionalChain, old_optional_chain: ?OptionalChain, left: *Expr) anyerror!Continuation {
            if (old_optional_chain != null) {
                p.log.addRangeError(p.source, p.lexer.range(), "Template literals cannot have an optional chain as a tag") catch unreachable;
            }
            // p.markSyntaxFeature(compat.TemplateLiteral, p.lexer.Range());
            const head = p.lexer.rawTemplateContents();
            try p.lexer.next();

            left.* = p.newExpr(E.Template{
                .tag = left.*,
                .head = .{ .raw = head },
            }, left.loc);
            return .next;
        }
        fn t_template_head(p: *P, _: Level, _: *?OptionalChain, old_optional_chain: ?OptionalChain, left: *Expr) anyerror!Continuation {
            if (old_optional_chain != null) {
                p.log.addRangeError(p.source, p.lexer.range(), "Template literals cannot have an optional chain as a tag") catch unreachable;
            }
            // p.markSyntaxFeature(compat.TemplateLiteral, p.lexer.Range());
            const head = p.lexer.rawTemplateContents();
            const partsGroup = try p.parseTemplateParts(true);
            const tag = left.*;
            left.* = p.newExpr(E.Template{
                .tag = tag,
                .head = .{ .raw = head },
                .parts = partsGroup,
            }, left.loc);
            return .next;
        }
        fn t_open_bracket(p: *P, optional_chain: *?OptionalChain, old_optional_chain: ?OptionalChain, left: *Expr, flags: Expr.EFlags) anyerror!Continuation {
            // When parsing a decorator, ignore EIndex expressions since they may be
            // part of a computed property:
            //
            //   class Foo {
            //     @foo ['computed']() {}
            //   }
            //
            // This matches the behavior of the TypeScript compiler.
            if (flags == .ts_decorator) {
                return .done;
            }

            try p.lexer.next();

            // Allow "in" inside the brackets
            const old_allow_in = p.allow_in;
            p.allow_in = true;

            const index = try p.parseExpr(.lowest);

            p.allow_in = old_allow_in;

            try p.lexer.expect(.t_close_bracket);

            left.* = p.newExpr(E.Index{
                .target = left.*,
                .index = index,
                .optional_chain = old_optional_chain,
            }, left.loc);
            optional_chain.* = old_optional_chain;
            return .next;
        }
        fn t_open_paren(p: *P, level: Level, optional_chain: *?OptionalChain, old_optional_chain: ?OptionalChain, left: *Expr) anyerror!Continuation {
            if (level.gte(.call)) {
                return .done;
            }

            // Parabun: reject Date() calls inside pure functions (returns current time)
            if (p.fn_or_arrow_data_parse.is_pure) {
                if (left.data == .e_identifier) {
                    const callee_name = p.loadNameFromRef(left.data.e_identifier.ref);
                    if (bun.strings.eqlComptime(callee_name, "Date")) {
                        p.log.addRangeErrorFmt(p.source, .{ .loc = left.loc, .len = 4 }, p.allocator, "Cannot call \"Date()\" inside a pure function — it returns the current time", .{}) catch unreachable;
                    }
                }
            }

            const list_loc = try p.parseCallArgs();
            left.* = p.newExpr(
                E.Call{
                    .target = left.*,
                    .args = list_loc.list,
                    .close_paren_loc = list_loc.loc,
                    .optional_chain = old_optional_chain,
                },
                left.loc,
            );
            optional_chain.* = old_optional_chain;
            return .next;
        }
        fn t_question(p: *P, level: Level, noalias errors: ?*DeferredErrors, left: *Expr) anyerror!Continuation {
            if (level.gte(.conditional)) {
                return .done;
            }
            try p.lexer.next();

            // Stop now if we're parsing one of these:
            // "(a?) => {}"
            // "(a?: b) => {}"
            // "(a?, b?) => {}"
            if (is_typescript_enabled and left.loc.start == p.latest_arrow_arg_loc.start and (p.lexer.token == .t_colon or
                p.lexer.token == .t_close_paren or p.lexer.token == .t_comma))
            {
                if (errors == null) {
                    try p.lexer.unexpected();
                    return error.SyntaxError;
                }
                errors.?.invalid_expr_after_question = p.lexer.range();
                return .done;
            }

            const ternary = p.newExpr(E.If{
                .test_ = left.*,
                .yes = undefined,
                .no = undefined,
            }, left.loc);

            // Allow "in" in between "?" and ":"
            const old_allow_in = p.allow_in;
            p.allow_in = true;

            // condition ? yes : no
            //             ^
            try p.parseExprWithFlags(.comma, .none, &ternary.data.e_if.yes);

            p.allow_in = old_allow_in;

            // condition ? yes : no
            //                 ^
            try p.lexer.expect(.t_colon);

            // condition ? yes : no
            //                   ^
            try p.parseExprWithFlags(.comma, .none, &ternary.data.e_if.no);

            // condition ? yes : no
            //                     ^

            left.* = ternary;
            return .next;
        }
        fn t_exclamation(p: *P, optional_chain: *?OptionalChain, old_optional_chain: ?OptionalChain) anyerror!Continuation {
            // Skip over TypeScript non-null assertions
            if (p.lexer.has_newline_before) {
                return .done;
            }

            if (!is_typescript_enabled) {
                try p.lexer.unexpected();
                return error.SyntaxError;
            }

            try p.lexer.next();
            optional_chain.* = old_optional_chain;

            return .next;
        }
        fn t_minus_minus(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (p.lexer.has_newline_before or level.gte(.postfix)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Unary{ .op = .un_post_dec, .value = left.* }, left.loc);
            return .next;
        }
        fn t_plus_plus(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (p.lexer.has_newline_before or level.gte(.postfix)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Unary{ .op = .un_post_inc, .value = left.* }, left.loc);
            return .next;
        }
        fn t_comma(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.comma)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_comma, .left = left.*, .right = try p.parseExpr(.comma) }, left.loc);
            return .next;
        }
        fn t_plus(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.add)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_add, .left = left.*, .right = try p.parseExpr(.add) }, left.loc);
            return .next;
        }
        fn t_plus_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_add_assign, .left = left.*, .right = try p.parseExpr(@as(Op.Level, @enumFromInt(@intFromEnum(Op.Level.assign) - 1))) }, left.loc);
            return .next;
        }
        fn t_minus(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.add)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_sub, .left = left.*, .right = try p.parseExpr(.add) }, left.loc);
            return .next;
        }
        fn t_minus_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_sub_assign, .left = left.*, .right = try p.parseExpr(Op.Level.sub(Op.Level.assign, 1)) }, left.loc);
            return .next;
        }
        fn t_asterisk(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.multiply)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_mul, .left = left.*, .right = try p.parseExpr(.multiply) }, left.loc);
            return .next;
        }
        fn t_asterisk_asterisk(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.exponentiation)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_pow, .left = left.*, .right = try p.parseExpr(Op.Level.exponentiation.sub(1)) }, left.loc);
            return .next;
        }
        fn t_asterisk_asterisk_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_pow_assign, .left = left.*, .right = try p.parseExpr(Op.Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_asterisk_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_mul_assign, .left = left.*, .right = try p.parseExpr(Op.Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_percent(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.multiply)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_rem, .left = left.*, .right = try p.parseExpr(Op.Level.multiply) }, left.loc);
            return .next;
        }
        fn t_percent_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_rem_assign, .left = left.*, .right = try p.parseExpr(Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_slash(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.multiply)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_div, .left = left.*, .right = try p.parseExpr(Level.multiply) }, left.loc);
            return .next;
        }
        fn t_slash_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_div_assign, .left = left.*, .right = try p.parseExpr(Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_equals_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.equals)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_loose_eq, .left = left.*, .right = try p.parseExpr(Level.equals) }, left.loc);
            return .next;
        }
        fn t_exclamation_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.equals)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_loose_ne, .left = left.*, .right = try p.parseExpr(Level.equals) }, left.loc);
            return .next;
        }
        fn t_equals_equals_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.equals)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_strict_eq, .left = left.*, .right = try p.parseExpr(Level.equals) }, left.loc);
            return .next;
        }
        fn t_exclamation_equals_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.equals)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_strict_ne, .left = left.*, .right = try p.parseExpr(Level.equals) }, left.loc);
            return .next;
        }
        fn t_less_than(p: *P, level: Level, optional_chain: *?OptionalChain, old_optional_chain: ?OptionalChain, left: *Expr) anyerror!Continuation {
            // TypeScript allows type arguments to be specified with angle brackets
            // inside an expression. Unlike in other languages, this unfortunately
            // appears to require backtracking to parse.
            if (is_typescript_enabled and p.trySkipTypeScriptTypeArgumentsWithBacktracking()) {
                optional_chain.* = old_optional_chain;
                return .next;
            }

            if (level.gte(.compare)) {
                return .done;
            }
            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_lt, .left = left.*, .right = try p.parseExpr(.compare) }, left.loc);
            return .next;
        }
        fn t_less_than_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.compare)) {
                return .done;
            }
            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_le, .left = left.*, .right = try p.parseExpr(.compare) }, left.loc);
            return .next;
        }
        fn t_greater_than(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.compare)) {
                return .done;
            }
            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_gt, .left = left.*, .right = try p.parseExpr(.compare) }, left.loc);
            return .next;
        }
        fn t_greater_than_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.compare)) {
                return .done;
            }
            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_ge, .left = left.*, .right = try p.parseExpr(.compare) }, left.loc);
            return .next;
        }
        fn t_less_than_less_than(p: *P, level: Level, optional_chain: *?OptionalChain, old_optional_chain: ?OptionalChain, left: *Expr) anyerror!Continuation {
            // TypeScript allows type arguments to be specified with angle brackets
            // inside an expression. Unlike in other languages, this unfortunately
            // appears to require backtracking to parse.
            if (is_typescript_enabled and p.trySkipTypeScriptTypeArgumentsWithBacktracking()) {
                optional_chain.* = old_optional_chain;
                return .next;
            }

            if (level.gte(.shift)) {
                return .done;
            }
            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_shl, .left = left.*, .right = try p.parseExpr(.shift) }, left.loc);
            return .next;
        }
        fn t_less_than_less_than_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_shl_assign, .left = left.*, .right = try p.parseExpr(Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_greater_than_greater_than(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.shift)) {
                return .done;
            }
            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_shr, .left = left.*, .right = try p.parseExpr(.shift) }, left.loc);
            return .next;
        }
        fn t_greater_than_greater_than_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_shr_assign, .left = left.*, .right = try p.parseExpr(Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_greater_than_greater_than_greater_than(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.shift)) {
                return .done;
            }
            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_u_shr, .left = left.*, .right = try p.parseExpr(.shift) }, left.loc);
            return .next;
        }
        fn t_greater_than_greater_than_greater_than_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_u_shr_assign, .left = left.*, .right = try p.parseExpr(Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_question_question(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.nullish_coalescing)) {
                return .done;
            }
            try p.lexer.next();
            const prev = left.*;
            left.* = p.newExpr(E.Binary{ .op = .bin_nullish_coalescing, .left = prev, .right = try p.parseExpr(.nullish_coalescing) }, left.loc);
            return .next;
        }
        fn t_question_question_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_nullish_coalescing_assign, .left = left.*, .right = try p.parseExpr(Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_bar_bar(p: *P, level: Level, left: *Expr, flags: Expr.EFlags) anyerror!Continuation {
            if (level.gte(.logical_or)) {
                return .done;
            }

            // Prevent "||" inside "??" from the right
            if (level.eql(.nullish_coalescing)) {
                try p.lexer.unexpected();
                return error.SyntaxError;
            }

            try p.lexer.next();
            const right = try p.parseExpr(.logical_or);
            left.* = p.newExpr(E.Binary{ .op = Op.Code.bin_logical_or, .left = left.*, .right = right }, left.loc);

            if (level.lt(.nullish_coalescing)) {
                try p.parseSuffix(left, Level.nullish_coalescing.addF(1), null, flags);

                if (p.lexer.token == .t_question_question) {
                    try p.lexer.unexpected();
                    return error.SyntaxError;
                }
            }
            return .next;
        }
        fn t_bar_bar_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_logical_or_assign, .left = left.*, .right = try p.parseExpr(Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_ampersand_ampersand(p: *P, level: Level, left: *Expr, flags: Expr.EFlags) anyerror!Continuation {
            if (level.gte(.logical_and)) {
                return .done;
            }

            // Prevent "&&" inside "??" from the right
            if (level.eql(.nullish_coalescing)) {
                try p.lexer.unexpected();
                return error.SyntaxError;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_logical_and, .left = left.*, .right = try p.parseExpr(.logical_and) }, left.loc);

            // Prevent "&&" inside "??" from the left
            if (level.lt(.nullish_coalescing)) {
                try p.parseSuffix(left, Level.nullish_coalescing.addF(1), null, flags);

                if (p.lexer.token == .t_question_question) {
                    try p.lexer.unexpected();
                    return error.SyntaxError;
                }
            }
            return .next;
        }
        fn t_ampersand_ampersand_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_logical_and_assign, .left = left.*, .right = try p.parseExpr(Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_bar(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.bitwise_or)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_bitwise_or, .left = left.*, .right = try p.parseExpr(.bitwise_or) }, left.loc);
            return .next;
        }
        fn t_bar_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_bitwise_or_assign, .left = left.*, .right = try p.parseExpr(Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_ampersand(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.bitwise_and)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_bitwise_and, .left = left.*, .right = try p.parseExpr(.bitwise_and) }, left.loc);
            return .next;
        }
        fn t_ampersand_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_bitwise_and_assign, .left = left.*, .right = try p.parseExpr(Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_caret(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.bitwise_xor)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_bitwise_xor, .left = left.*, .right = try p.parseExpr(.bitwise_xor) }, left.loc);
            return .next;
        }
        fn t_caret_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_bitwise_xor_assign, .left = left.*, .right = try p.parseExpr(Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            try p.lexer.next();

            left.* = p.newExpr(E.Binary{ .op = .bin_assign, .left = left.*, .right = try p.parseExpr(Level.assign.sub(1)) }, left.loc);
            return .next;
        }
        fn t_dot_dot_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            // Parabun: `x ..= expr` desugars to `x = await expr`
            if (level.gte(.assign)) {
                return .done;
            }

            const dot_dot_eq_range = p.lexer.range();
            try p.lexer.next();

            if (p.fn_or_arrow_data_parse.allow_await != .allow_expr) {
                p.log.addRangeError(p.source, dot_dot_eq_range, "\"..=\" can only be used inside an async function or at the top level") catch unreachable;
            } else if (p.fn_or_arrow_data_parse.is_top_level) {
                p.top_level_await_keyword = dot_dot_eq_range;
            }

            const rhs = try p.parseExpr(Level.assign.sub(1));
            const await_expr = p.newExpr(E.Await{ .value = rhs, .can_elide = true }, dot_dot_eq_range.loc);
            left.* = p.newExpr(E.Binary{ .op = .bin_assign, .left = left.*, .right = await_expr }, left.loc);
            return .next;
        }
        fn t_dot_dot_exclamation(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            // Parabun: `expr ..! handler` desugars to `expr.catch(handler)`
            if (level.gte(.conditional)) {
                return .done;
            }

            const op_range = p.lexer.range();
            try p.lexer.next();

            const rhs = try p.parseExpr(.conditional);

            // Build: left.catch(rhs)
            const catch_target = p.newExpr(E.Dot{
                .target = left.*,
                .name = "catch",
                .name_loc = op_range.loc,
            }, left.loc);
            const args = try ExprNodeList.initOne(p.allocator, rhs);
            left.* = p.newExpr(E.Call{
                .target = catch_target,
                .args = args,
                .close_paren_loc = p.lexer.loc(),
            }, left.loc);
            return .next;
        }
        fn t_dot_dot_ampersand(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            // Parabun: `expr ..& cleanup` desugars to `expr.finally(cleanup)`
            if (level.gte(.conditional)) {
                return .done;
            }

            const op_range = p.lexer.range();
            try p.lexer.next();

            const rhs = try p.parseExpr(.conditional);

            // Build: left.finally(rhs)
            const finally_target = p.newExpr(E.Dot{
                .target = left.*,
                .name = "finally",
                .name_loc = op_range.loc,
            }, left.loc);
            const args = try ExprNodeList.initOne(p.allocator, rhs);
            left.* = p.newExpr(E.Call{
                .target = finally_target,
                .args = args,
                .close_paren_loc = p.lexer.loc(),
            }, left.loc);
            return .next;
        }
        fn t_bar_greater_than(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            // Parabun: `expr |> fn` desugars to `fn(expr)`
            // Binds tighter than ..! and ..& (conditional), so:
            //   data |> transform ..! handler → transform(data).catch(handler)
            if (level.gte(.nullish_coalescing)) {
                return .done;
            }

            try p.lexer.next();

            const rhs = try p.parseExpr(.nullish_coalescing);

            // Parabun: pipeline inline fusion — inline pure function bodies
            if (tryInlinePipeline(p, left, rhs)) {
                return .next;
            }

            // Build: rhs(left)
            const args = try ExprNodeList.initOne(p.allocator, left.*);
            left.* = p.newExpr(E.Call{
                .target = rhs,
                .args = args,
                .close_paren_loc = p.lexer.loc(),
            }, left.loc);
            return .next;
        }

        /// Try to inline a pure function body at a pipeline call site.
        /// Returns true if inlining succeeded and `left` was updated.
        fn tryInlinePipeline(p: *P, left: *Expr, rhs: Expr) bool {
            // Case 1: RHS is an inline pure arrow — pure (x) => expr
            if (rhs.data == .e_arrow) {
                const arrow = rhs.data.e_arrow;
                if (arrow.is_pure and arrow.args.len == 1 and
                    arrow.args[0].default == null and
                    arrow.args[0].binding.data == .b_identifier and
                    arrow.body.stmts.len == 1 and
                    arrow.body.stmts[0].data == .s_return)
                {
                    if (arrow.body.stmts[0].data.s_return.value) |body_expr| {
                        const param_name = p.loadNameFromRef(arrow.args[0].binding.data.b_identifier.ref);
                        if (substituteByName(p, body_expr, param_name, left.*)) |result| {
                            left.* = result;
                            return true;
                        }
                    }
                }
                return false;
            }

            // Case 2: RHS is an inline pure function expression
            if (rhs.data == .e_function) {
                const func = rhs.data.e_function.func;
                if (func.flags.contains(.is_pure) and func.args.len == 1 and
                    func.args[0].default == null and
                    func.args[0].binding.data == .b_identifier and
                    func.body.stmts.len == 1 and
                    func.body.stmts[0].data == .s_return)
                {
                    if (func.body.stmts[0].data.s_return.value) |body_expr| {
                        const param_name = p.loadNameFromRef(func.args[0].binding.data.b_identifier.ref);
                        if (substituteByName(p, body_expr, param_name, left.*)) |result| {
                            left.* = result;
                            return true;
                        }
                    }
                }
                return false;
            }

            // Case 3: RHS is an identifier — look up in the pure inline map
            if (rhs.data == .e_identifier) {
                const fn_name = p.loadNameFromRef(rhs.data.e_identifier.ref);
                for (p.pure_inline_fns.items) |info| {
                    if (bun.strings.eql(info.fn_name, fn_name)) {
                        if (substituteByName(p, info.body_expr, info.param_name, left.*)) |result| {
                            left.* = result;
                            return true;
                        }
                        break;
                    }
                }
                return false;
            }

            return false;
        }

        fn substituteByName(p: *P, expr: Expr, param_name: string, replacement: Expr) ?Expr {
            return switch (expr.data) {
                .e_identifier => |id| if (bun.strings.eql(p.loadNameFromRef(id.ref), param_name)) replacement else expr,
                .e_number, .e_string, .e_null, .e_undefined, .e_missing => expr,
                .e_binary => |bin| {
                    const new_left = substituteByName(p, bin.left, param_name, replacement) orelse return null;
                    const new_right = substituteByName(p, bin.right, param_name, replacement) orelse return null;
                    return Expr.init(E.Binary, .{
                        .op = bin.op,
                        .left = new_left,
                        .right = new_right,
                    }, expr.loc);
                },
                .e_unary => |un| {
                    const new_val = substituteByName(p, un.value, param_name, replacement) orelse return null;
                    return Expr.init(E.Unary, .{
                        .op = un.op,
                        .value = new_val,
                    }, expr.loc);
                },
                .e_dot => |dot| {
                    const new_target = substituteByName(p, dot.target, param_name, replacement) orelse return null;
                    return Expr.init(E.Dot, .{
                        .target = new_target,
                        .name = dot.name,
                        .name_loc = dot.name_loc,
                    }, expr.loc);
                },
                .e_index => |idx| {
                    const new_target = substituteByName(p, idx.target, param_name, replacement) orelse return null;
                    const new_index = substituteByName(p, idx.index, param_name, replacement) orelse return null;
                    return Expr.init(E.Index, .{
                        .target = new_target,
                        .index = new_index,
                    }, expr.loc);
                },
                .e_call => |call| {
                    const new_target = substituteByName(p, call.target, param_name, replacement) orelse return null;
                    const new_args_slice = p.allocator.alloc(Expr, call.args.len) catch return null;
                    for (call.args.slice(), 0..) |arg, i| {
                        new_args_slice[i] = substituteByName(p, arg, param_name, replacement) orelse return null;
                    }
                    return Expr.init(E.Call, .{
                        .target = new_target,
                        .args = ExprNodeList.fromOwnedSlice(new_args_slice),
                        .close_paren_loc = call.close_paren_loc,
                    }, expr.loc);
                },
                .e_if => |cond| {
                    const new_test = substituteByName(p, cond.test_, param_name, replacement) orelse return null;
                    const new_yes = substituteByName(p, cond.yes, param_name, replacement) orelse return null;
                    const new_no = substituteByName(p, cond.no, param_name, replacement) orelse return null;
                    return Expr.init(E.If, .{
                        .test_ = new_test,
                        .yes = new_yes,
                        .no = new_no,
                    }, expr.loc);
                },
                else => null,
            };
        }
        fn t_in(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.compare) or !p.allow_in) {
                return .done;
            }

            // Warn about "!a in b" instead of "!(a in b)"
            switch (left.data) {
                .e_unary => |unary| {
                    if (unary.op == .un_not) {
                        // TODO:
                        // p.log.addRangeWarning(source: ?Source, r: Range, text: string)
                    }
                },
                else => {},
            }

            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_in, .left = left.*, .right = try p.parseExpr(.compare) }, left.loc);
            return .next;
        }
        fn t_instanceof(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.compare)) {
                return .done;
            }

            // Warn about "!a instanceof b" instead of "!(a instanceof b)". Here's an
            // example of code with this problem: https://github.com/mrdoob/three.js/pull/11182.
            if (!p.options.suppress_warnings_about_weird_code) {
                switch (left.data) {
                    .e_unary => |unary| {
                        if (unary.op == .un_not) {
                            // TODO:
                            // p.log.addRangeWarning(source: ?Source, r: Range, text: string)
                        }
                    },
                    else => {},
                }
            }
            try p.lexer.next();
            left.* = p.newExpr(E.Binary{ .op = .bin_instanceof, .left = left.*, .right = try p.parseExpr(.compare) }, left.loc);
            return .next;
        }

        pub fn parseSuffix(p: *P, left_and_out: *Expr, level: Level, noalias errors: ?*DeferredErrors, flags: Expr.EFlags) anyerror!void {
            var left_value = left_and_out.*;
            // Zig has a bug where it creates a new address to stack locals each & usage.
            const left = &left_value;

            var optional_chain_: ?OptionalChain = null;
            const optional_chain = &optional_chain_;
            while (true) {
                if (p.lexer.loc().start == p.after_arrow_body_loc.start) {
                    defer left_and_out.* = left_value;
                    next_token: switch (p.lexer.token) {
                        .t_comma => {
                            if (level.gte(.comma)) {
                                return;
                            }

                            try p.lexer.next();
                            left.* = p.newExpr(E.Binary{
                                .op = .bin_comma,
                                .left = left.*,
                                .right = try p.parseExpr(.comma),
                            }, left.loc);

                            continue :next_token p.lexer.token;
                        },
                        else => {
                            return;
                        },
                    }
                }

                if (comptime is_typescript_enabled) {
                    // Stop now if this token is forbidden to follow a TypeScript "as" cast
                    if (p.forbid_suffix_after_as_loc.start > -1 and p.lexer.loc().start == p.forbid_suffix_after_as_loc.start) {
                        break;
                    }
                }

                // Reset the optional chain flag by default. That way we won't accidentally
                // treat "c.d" as OptionalChainContinue in "a?.b + c.d".
                const old_optional_chain = optional_chain.*;
                optional_chain.* = null;

                // Each of these tokens are split into a function to conserve
                // stack space. Currently in Zig, the compiler does not reuse
                // stack space between scopes This means that having a large
                // function with many scopes and local variables consumes
                // enormous amounts of stack space.
                const continuation = switch (p.lexer.token) {
                    inline .t_ampersand,
                    .t_ampersand_ampersand_equals,
                    .t_ampersand_equals,
                    .t_asterisk,
                    .t_asterisk_asterisk,
                    .t_asterisk_asterisk_equals,
                    .t_asterisk_equals,
                    .t_bar,
                    .t_bar_bar_equals,
                    .t_bar_equals,
                    .t_caret,
                    .t_caret_equals,
                    .t_comma,
                    .t_dot_dot_equals,
                    .t_dot_dot_exclamation,
                    .t_dot_dot_ampersand,
                    .t_bar_greater_than,
                    .t_equals,
                    .t_equals_equals,
                    .t_equals_equals_equals,
                    .t_exclamation_equals,
                    .t_exclamation_equals_equals,
                    .t_greater_than,
                    .t_greater_than_equals,
                    .t_greater_than_greater_than,
                    .t_greater_than_greater_than_equals,
                    .t_greater_than_greater_than_greater_than,
                    .t_greater_than_greater_than_greater_than_equals,
                    .t_in,
                    .t_instanceof,
                    .t_less_than_equals,
                    .t_less_than_less_than_equals,
                    .t_minus,
                    .t_minus_equals,
                    .t_minus_minus,
                    .t_percent,
                    .t_percent_equals,
                    .t_plus,
                    .t_plus_equals,
                    .t_plus_plus,
                    .t_question_question,
                    .t_question_question_equals,
                    .t_slash,
                    .t_slash_equals,
                    => |tag| @field(@This(), @tagName(tag))(p, level, left),
                    .t_exclamation => t_exclamation(p, optional_chain, old_optional_chain),
                    .t_bar_bar => t_bar_bar(p, level, left, flags),
                    .t_ampersand_ampersand => t_ampersand_ampersand(p, level, left, flags),
                    .t_question => t_question(p, level, errors, left),
                    .t_question_dot => t_question_dot(p, level, optional_chain, left),
                    .t_template_head => t_template_head(p, level, optional_chain, old_optional_chain, left),
                    .t_less_than => t_less_than(p, level, optional_chain, old_optional_chain, left),
                    .t_open_paren => t_open_paren(p, level, optional_chain, old_optional_chain, left),
                    .t_no_substitution_template_literal => t_no_substitution_template_literal(p, level, optional_chain, old_optional_chain, left),
                    .t_open_bracket => t_open_bracket(p, optional_chain, old_optional_chain, left, flags),
                    .t_dot => t_dot(p, optional_chain, old_optional_chain, left),
                    .t_less_than_less_than => t_less_than_less_than(p, level, optional_chain, old_optional_chain, left),
                    else => handleTypescriptAs(p, level),
                };

                switch (try continuation) {
                    .next => {
                        // Parabun: reject parameter mutation inside pure functions.
                        // Each assign/update handler builds an E.Binary(bin_*_assign) or
                        // E.Unary(un_post_inc/dec) wrapping `left`; check the new shape.
                        if (p.fn_or_arrow_data_parse.is_pure and p.fn_or_arrow_data_parse.pure_param_names.len != 0) {
                            switch (left.data) {
                                .e_binary => |bin| if (js_ast.Op.Code.binaryAssignTarget(bin.op) != .none) {
                                    js_parser.checkPureParamMutation(p, bin.left, left.loc);
                                },
                                .e_unary => |un| if (js_ast.Op.Code.unaryAssignTarget(un.op) != .none) {
                                    js_parser.checkPureParamMutation(p, un.value, left.loc);
                                },
                                else => {},
                            }
                        }
                    },
                    .done => break,
                }
            }

            left_and_out.* = left_value;
        }
    };
}
const Continuation = enum { next, done };
const string = []const u8;

const bun = @import("bun");

const js_ast = bun.ast;
const E = js_ast.E;
const Expr = js_ast.Expr;
const ExprNodeList = js_ast.ExprNodeList;
const OptionalChain = js_ast.OptionalChain;

const Op = js_ast.Op;
const Level = js_ast.Op.Level;

const js_lexer = bun.js_lexer;
const T = js_lexer.T;

const js_parser = bun.js_parser;
const DeferredErrors = js_parser.DeferredErrors;
const JSXTransformType = js_parser.JSXTransformType;
const SideEffects = js_parser.SideEffects;
const TypeScript = js_parser.TypeScript;
const options = js_parser.options;
