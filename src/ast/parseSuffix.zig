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
        fn t_dot_dot(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            // Parabun: `a..b` is an exclusive range literal, desugaring to
            //   __parabunRange(a, b)
            // Binds tighter than comparison, looser than shift/add/member,
            // so `a+1..b-1` is `(a+1)..(b-1)` and `a..b < c` is `(a..b) < c`.
            if (level.gte(.shift)) {
                return .done;
            }

            const op_loc = p.lexer.loc();
            try p.lexer.next();

            const rhs = try p.parseExpr(.shift);

            const args = p.allocator.alloc(Expr, 2) catch unreachable;
            args[0] = left.*;
            args[1] = rhs;
            left.* = p.callRuntime(op_loc, "__parabunRange", args);
            return .next;
        }
        fn t_dot_dot_equals(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            // Parabun: `a ..= b` desugars to `__parabunRangeInclusive(a, b)`.
            // (Previously `..=` was overloaded with await-assign — `x ..= fetch()`
            // meant `x = await fetch()`. That meaning was removed 2026-04 to give
            // `..=` a single, unambiguous role as the inclusive-range pair to `..`.)
            if (level.gte(.shift)) {
                return .done;
            }

            const op_loc = p.lexer.loc();
            try p.lexer.next();

            const rhs = try p.parseExpr(.shift);

            const args = p.allocator.alloc(Expr, 2) catch unreachable;
            args[0] = left.*;
            args[1] = rhs;
            left.* = p.callRuntime(op_loc, "__parabunRangeInclusive", args);
            return .next;
        }
        // Parabun: leading-dot sugar for chain-op handlers — `..> .json()` /
        // `..! .message`, AND for general argument positions —
        // `map(.score)` / `filter(.active)`. The leading `.` is unambiguous
        // in either position (a chain operator or a comma/open-paren has
        // already consumed everything to the left), so we synthesize an
        // arrow `(__pcv) => __pcv.<chain>` whose body is the dot-prefixed
        // property/call chain. The synthesized param name is `__pcv` (Para
        // chain value) — chosen to match the `__pb0` family of Parabun
        // synthetic identifiers and to be unlikely to collide with any user
        // identifier.
        //
        // The lexer is positioned at the leading `.` on entry; on return the
        // arrow body has consumed the full member/call chain via parseSuffix
        // run with `in_chain_op_arrow_rhs = true`, so the next chain op (if
        // any) terminates the body.
        pub fn parseLeadingDotChainHandler(p: *P, op_loc: logger.Loc) anyerror!Expr {
            const dot_loc = p.lexer.loc();
            // Scope locations must be strictly increasing
            // (pushScopeForParsePass enforces it). Chain-op callers pass
            // op_loc = chain-operator loc, naturally < dot_loc. Arg-
            // position callers pass op_loc = dot_loc (no separate
            // operator); fabricate an arrow_loc one byte before the dot
            // — that's the `(` / `,` / whitespace immediately preceding
            // it, which no other path pushes a scope at.
            const arrow_loc: logger.Loc = if (op_loc.start < dot_loc.start)
                op_loc
            else
                .{ .start = if (dot_loc.start > 0) dot_loc.start - 1 else 0 };

            // Push the arrow's scopes for the visit pass — same dance as the
            // ~> / -> arrow synthesis above.
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_args, arrow_loc) catch bun.outOfMemory();
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_body, dot_loc) catch bun.outOfMemory();

            const param_name = "__pcv";
            const param_ref = try p.declareSymbol(.constant, dot_loc, param_name);
            const param_ident = p.newExpr(E.Identifier{ .ref = param_ref }, dot_loc);

            // Run the suffix loop on top of the synthetic identifier with the
            // chain-op terminator flag set so any ..!/..&/..> stops the body.
            // The loop happily eats the leading `.` and any following member
            // accesses, indexes, and calls.
            var body_expr = param_ident;
            const old_in_chain = p.in_chain_op_arrow_rhs;
            p.in_chain_op_arrow_rhs = true;
            try p.parseSuffix(&body_expr, .assign, null, Expr.EFlags.none);
            p.in_chain_op_arrow_rhs = old_in_chain;

            p.popScope();
            p.popScope();

            const body_stmts = bun.handleOom(p.allocator.alloc(Stmt, 1));
            body_stmts[0] = p.s(S.Return{ .value = body_expr }, dot_loc);

            const args_slice = bun.handleOom(p.allocator.alloc(G.Arg, 1));
            args_slice[0] = .{ .binding = p.b(B.Identifier{ .ref = param_ref }, dot_loc) };

            return p.newExpr(E.Arrow{
                .args = args_slice,
                .body = .{ .loc = dot_loc, .stmts = body_stmts },
                .prefer_expr = true,
                .is_async = false,
            }, arrow_loc);
        }

        fn t_dot_dot_exclamation(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            // Parabun: `expr ..! handler` desugars to `expr.catch(handler)`.
            // RHS parses at .assign so a bare arrow handler works
            // (`p ..! err => fallback`); while we're inside the RHS the
            // `in_chain_op_arrow_rhs` flag below tells nested chain-op handlers
            // to back off, so the arrow body terminates at the next ..!/..&/..>.
            if (level.gte(.conditional) or p.in_chain_op_arrow_rhs) {
                return .done;
            }

            const op_range = p.lexer.range();
            try p.lexer.next();

            // Parabun: leading-dot sugar — `..! .message` desugars to
            // `..! (__pcv) => __pcv.message`. Triggered only when a bare `.`
            // is the first token after the chain operator.
            const rhs = if (p.lexer.token == .t_dot)
                try parseLeadingDotChainHandler(p, op_range.loc)
            else blk: {
                const old_in_chain = p.in_chain_op_arrow_rhs;
                p.in_chain_op_arrow_rhs = true;
                const parsed = try p.parseExpr(.assign);
                p.in_chain_op_arrow_rhs = old_in_chain;
                break :blk parsed;
            };

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
            // Parabun: `expr ..& cleanup` desugars to `expr.finally(cleanup)`.
            // See t_dot_dot_exclamation for the bare-arrow / chain-op-terminator rationale.
            if (level.gte(.conditional) or p.in_chain_op_arrow_rhs) {
                return .done;
            }

            const op_range = p.lexer.range();
            try p.lexer.next();

            const old_in_chain = p.in_chain_op_arrow_rhs;
            p.in_chain_op_arrow_rhs = true;
            const rhs = try p.parseExpr(.assign);
            p.in_chain_op_arrow_rhs = old_in_chain;

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
        fn t_dot_dot_greater_than(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            // Parabun: `expr ..> handler` desugars to `expr.then(handler)`.
            // See t_dot_dot_exclamation for the bare-arrow / chain-op-terminator rationale.
            if (level.gte(.conditional) or p.in_chain_op_arrow_rhs) {
                return .done;
            }

            const op_range = p.lexer.range();
            try p.lexer.next();

            // Parabun: leading-dot sugar — `..> .json()` desugars to
            // `..> (__pcv) => __pcv.json()`. See parseLeadingDotChainHandler.
            const rhs = if (p.lexer.token == .t_dot)
                try parseLeadingDotChainHandler(p, op_range.loc)
            else blk: {
                const old_in_chain = p.in_chain_op_arrow_rhs;
                p.in_chain_op_arrow_rhs = true;
                const parsed = try p.parseExpr(.assign);
                p.in_chain_op_arrow_rhs = old_in_chain;
                break :blk parsed;
            };

            // Build: left.then(rhs)
            const then_target = p.newExpr(E.Dot{
                .target = left.*,
                .name = "then",
                .name_loc = op_range.loc,
            }, left.loc);
            const args = try ExprNodeList.initOne(p.allocator, rhs);
            left.* = p.newExpr(E.Call{
                .target = then_target,
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

            // Parabun: method shorthand — `x |> .foo` builds `x.foo` directly.
            // Any trailing `(args)` / `.prop` / `[idx]` is handled by the regular
            // suffix loop because the resulting member expression lands in `left`.
            //   x |> .json()        →  x.json()
            //   x |> .trim().split(",")  →  x.trim().split(",")
            //   x |> .a.b.c         →  x.a.b.c
            if (p.lexer.token == .t_dot) {
                try p.lexer.next();
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
                }, left.loc);
                return .next;
            }

            const rhs = try p.parseExpr(.nullish_coalescing);

            // Parabun: placeholder substitution — `x |> f(_, 2)` → `f(x, 2)`.
            // When the RHS is a call with `_` identifiers in its top-level args,
            // replace each `_` with the piped value. Multiple `_` copy the LHS
            // structurally; users with side-effectful LHS + multiple `_` should
            // bind to a const first.
            if (tryPipelinePlaceholder(p, left, rhs)) {
                return .next;
            }

            // Parabun: pipeline inline fusion — inline pure function bodies
            if (tryInlinePipeline(p, left, rhs)) {
                return .next;
            }

            // Parabun: stream fusion — collapse `src |> map(f) |> filter(g) |> sum`
            // (and friends) into a single `src.reduce((__pa, __px) => { ... }, init)`
            // pass so the intermediate arrays / call frames vanish.
            if (tryFuseStreamPipeline(p, left, rhs)) {
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

        // Parabun: `A ~> B` reactive binding — desugars to
        //   require("@para/signals").effect(() => { B = A; })
        //
        // The body is an arrow that evaluates A (tracking any signal reads) and
        // assigns to B. If B is a signal, the existing assignment-sugar pass
        // rewrites `B = A` to `B.set(A)`. If B is a plain property (e.g.
        // `elem.innerHTML`), it stays a property assignment. The overall
        // expression evaluates to the disposer returned by `effect()`, so users
        // can capture it: `const stop = src ~> dst;`.
        //
        // RHS must be assignable (identifier, dot, index). Anything else — call,
        // literal, arrow — is rejected with a parse error. Binds weakest of the
        // suffix operators (at `.assign` level), so `a |> f ~> sink` parses as
        // `(a |> f) ~> sink`.
        //
        // Conditional bind (LYK-767): `A ~> B when C` adds a guard. The desugar
        // becomes `require("@para/signals").effect(() => { if (C) B = A; })`.
        // C is read inside the effect so signal reads in the predicate are
        // tracked too — flipping C re-fires the effect, the body re-evaluates
        // the guard, and only assigns when the guard passes.
        fn t_tilde_greater_than(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            const op_loc = p.lexer.loc();
            try p.lexer.next();
            const body_loc = p.lexer.loc();

            const rhs = try p.parseExpr(.assign);

            switch (rhs.data) {
                .e_identifier, .e_dot, .e_index => {},
                else => {
                    try p.log.addError(
                        p.source,
                        rhs.loc,
                        "`~>` requires an assignable target on the right (identifier or property access)",
                    );
                    return .done;
                },
            }

            // Optional `when COND` guard (LYK-767). `when` is a contextual
            // keyword — it parses as a normal identifier elsewhere. Only
            // recognized immediately after the RHS of a `~>` chain.
            var guard: ?Expr = null;
            if (p.lexer.isContextualKeyword("when") and !p.lexer.has_newline_before) {
                try p.lexer.next();
                guard = try p.parseExpr(.assign);
            }

            const assign = p.newExpr(E.Binary{
                .op = .bin_assign,
                .left = rhs,
                .right = left.*,
            }, body_loc);
            const body_stmts = bun.handleOom(p.allocator.alloc(Stmt, 1));
            const assign_stmt = p.s(S.SExpr{ .value = assign }, body_loc);
            if (guard) |guard_expr| {
                // `if (guard) <single-stmt>`. We deliberately don't wrap the
                // assignment in an S.Block — the visit pass would expect a
                // matching block scope, and the suffix-parser path doesn't
                // own a stmt-level block scope here. Single-stmt yes is
                // semantically identical to a block in JS for this case.
                body_stmts[0] = p.s(S.If{
                    .test_ = guard_expr,
                    .yes = assign_stmt,
                    .no = null,
                }, body_loc);
            } else {
                body_stmts[0] = assign_stmt;
            }

            // Register arrow scopes so the visit pass can pop them in order.
            // We don't parse anything inside these scopes — the RHS and LHS
            // were parsed in the enclosing scope — but the arrow AST node
            // still needs matching scope markers at its loc and body_loc.
            // op_loc and body_loc are distinct (latter is after `~>` consumed).
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_args, op_loc) catch bun.outOfMemory();
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_body, body_loc) catch bun.outOfMemory();
            p.popScope();
            p.popScope();

            const arrow = p.newExpr(E.Arrow{
                .args = &.{},
                .body = .{ .loc = body_loc, .stmts = body_stmts },
                .prefer_expr = false,
                .is_async = false,
            }, op_loc);

            const require_ref = p.storeNameInRef("require") catch unreachable;
            const require_args = bun.handleOom(p.allocator.alloc(Expr, 1));
            require_args[0] = p.newExpr(E.String{ .data = "@para/signals" }, op_loc);
            const require_call = p.newExpr(E.Call{
                .target = p.newExpr(E.Identifier{ .ref = require_ref }, op_loc),
                .args = ExprNodeList.fromOwnedSlice(require_args),
            }, op_loc);
            const effect_dot = p.newExpr(E.Dot{
                .target = require_call,
                .name = "effect",
                .name_loc = op_loc,
            }, op_loc);
            const effect_args = bun.handleOom(p.allocator.alloc(Expr, 1));
            effect_args[0] = arrow;
            left.* = p.newExpr(E.Call{
                .target = effect_dot,
                .args = ExprNodeList.fromOwnedSlice(effect_args),
                .close_paren_loc = p.lexer.loc(),
            }, left.loc);
            return .next;
        }

        // Parabun: `A -> fn` reactive function-call binding — desugars to
        //   require("@para/signals").effect(() => { fn(A); })
        //
        // Complement to `~>`: where `~>` writes `A.get()` into an assignable
        // sink, `->` calls a function/method with `A.get()`. Reads naturally:
        // "this expression flows into this writer." Replaces the
        // `effect { someFn(template) }` boilerplate that's otherwise the
        // dominant shape for "render reactive value, push to sink."
        //
        //   `mic ${a}` -> process.stdout.write
        //   →  effect(() => { process.stdout.write(`mic ${a.get()}`); })
        //
        // Same level (.assign), same disposer return shape, same optional
        // `when COND` guard support as `~>`. RHS must be callable shape:
        // identifier, dot access, or index access. Bare-call expressions
        // (`fn()`) are rejected — call the operator with the function value
        // itself, not an applied call.
        fn t_minus_greater_than(p: *P, level: Level, left: *Expr) anyerror!Continuation {
            if (level.gte(.assign)) {
                return .done;
            }

            const op_loc = p.lexer.loc();
            try p.lexer.next();
            const body_loc = p.lexer.loc();

            const rhs = try p.parseExpr(.assign);

            switch (rhs.data) {
                .e_identifier, .e_dot, .e_index => {},
                else => {
                    try p.log.addError(
                        p.source,
                        rhs.loc,
                        "`->` requires a callable target on the right (identifier or property access; not a call expression)",
                    );
                    return .done;
                },
            }

            // Optional `when COND` guard — same shape as `~>`.
            var guard: ?Expr = null;
            if (p.lexer.isContextualKeyword("when") and !p.lexer.has_newline_before) {
                try p.lexer.next();
                guard = try p.parseExpr(.assign);
            }

            // Build the call expression: rhs(left)
            const call_args = bun.handleOom(p.allocator.alloc(Expr, 1));
            call_args[0] = left.*;
            const call = p.newExpr(E.Call{
                .target = rhs,
                .args = ExprNodeList.fromOwnedSlice(call_args),
                .close_paren_loc = body_loc,
            }, body_loc);

            const body_stmts = bun.handleOom(p.allocator.alloc(Stmt, 1));
            const call_stmt = p.s(S.SExpr{ .value = call }, body_loc);
            if (guard) |guard_expr| {
                body_stmts[0] = p.s(S.If{
                    .test_ = guard_expr,
                    .yes = call_stmt,
                    .no = null,
                }, body_loc);
            } else {
                body_stmts[0] = call_stmt;
            }

            // Same arrow-scope dance as `~>` so the visit pass pops cleanly.
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_args, op_loc) catch bun.outOfMemory();
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_body, body_loc) catch bun.outOfMemory();
            p.popScope();
            p.popScope();

            const arrow = p.newExpr(E.Arrow{
                .args = &.{},
                .body = .{ .loc = body_loc, .stmts = body_stmts },
                .prefer_expr = false,
                .is_async = false,
            }, op_loc);

            const require_ref = p.storeNameInRef("require") catch unreachable;
            const require_args = bun.handleOom(p.allocator.alloc(Expr, 1));
            require_args[0] = p.newExpr(E.String{ .data = "@para/signals" }, op_loc);
            const require_call = p.newExpr(E.Call{
                .target = p.newExpr(E.Identifier{ .ref = require_ref }, op_loc),
                .args = ExprNodeList.fromOwnedSlice(require_args),
            }, op_loc);
            const effect_dot = p.newExpr(E.Dot{
                .target = require_call,
                .name = "effect",
                .name_loc = op_loc,
            }, op_loc);
            const effect_args = bun.handleOom(p.allocator.alloc(Expr, 1));
            effect_args[0] = arrow;
            left.* = p.newExpr(E.Call{
                .target = effect_dot,
                .args = ExprNodeList.fromOwnedSlice(effect_args),
                .close_paren_loc = p.lexer.loc(),
            }, left.loc);
            return .next;
        }

        fn isUnderscorePlaceholder(p: *P, expr: Expr) bool {
            if (expr.data != .e_identifier) return false;
            const name = p.loadNameFromRef(expr.data.e_identifier.ref);
            return bun.strings.eqlComptime(name, "_");
        }

        fn tryPipelinePlaceholder(p: *P, left: *Expr, rhs: Expr) bool {
            if (rhs.data != .e_call) return false;
            const call = rhs.data.e_call;

            var placeholder_count: usize = 0;
            for (call.args.slice()) |arg| {
                if (isUnderscorePlaceholder(p, arg)) placeholder_count += 1;
            }
            if (placeholder_count == 0) return false;

            const new_args_slice = p.allocator.alloc(Expr, call.args.len) catch return false;
            for (call.args.slice(), 0..) |arg, i| {
                new_args_slice[i] = if (isUnderscorePlaceholder(p, arg)) left.* else arg;
            }

            left.* = p.newExpr(E.Call{
                .target = call.target,
                .args = ExprNodeList.fromOwnedSlice(new_args_slice),
                .close_paren_loc = call.close_paren_loc,
                .optional_chain = call.optional_chain,
            }, rhs.loc);
            return true;
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
                            // Track that this binding was consumed by fusion
                            // so ImportScanner can DCE the decl if no other
                            // (non-fused) reference to it exists.
                            p.pure_fusion_consumed_names.put(p.allocator, info.fn_name, {}) catch {};
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

        // Parabun: stream-fusion shapes recognized by tryFuseStreamPipeline.
        const StreamTerminal = union(enum) {
            sum,
            count,
            min,
            max,
            reduce_call: struct { init: Expr, fold: Expr },
            for_each: Expr, // forEach(fn) — fn is the callback
            collect, // collect / toArray — accumulate into array
            // Early-exit terminals — set the accumulator and `break;` out
            // of the for loop on first match.
            find: Expr, // find(pred) — first matching value (init undefined)
            find_index: Expr, // findIndex(pred) — first matching index (init -1)
            some: Expr, // some(pred) — bool (init false)
            every: Expr, // every(pred) — bool (init true)
        };

        const StreamStepKind = enum { map, filter, take };
        // For map/filter, `fn_or_pred` is the function/predicate. For take,
        // `fn_or_pred` is the count expression — emitter checks the kind
        // before reading.
        const StreamStep = struct { kind: StreamStepKind, fn_or_pred: Expr };

        // Range sources: `0..n |> ...` and `0..=n |> ...` desugar to runtime
        // calls (`__parabunRange(a, b)` / `__parabunRangeInclusive(a, b)`)
        // before reaching the fusion site. Recognizing that shape lets the
        // emitter skip the `__src.length` / `__src[__i]` boilerplate and
        // run the loop counter directly between the two bounds — no
        // intermediate range object materializes.
        const StreamSource = union(enum) {
            array: Expr, // ordinary array-like; uses src.length and src[i]
            range_excl: struct { lo: Expr, hi: Expr }, // 0..n  (i < hi)
            range_incl: struct { lo: Expr, hi: Expr }, // 0..=n (i <= hi)
        };

        fn classifyStreamSource(p: *P, source: Expr) StreamSource {
            // `a..b` and `a..=b` produce e_call where target is an
            // ImportIdentifier referencing the runtime helper. In non-bundle
            // builds the runtime symbol's `original_name` is hashed
            // (`__parabunRange_HASH`), so match by prefix. The inclusive
            // helper is checked first since its name extends the exclusive
            // one's prefix.
            if (source.data == .e_call) {
                const call = source.data.e_call;
                if (call.target.data == .e_import_identifier and call.args.len == 2) {
                    const ref = call.target.data.e_import_identifier.ref;
                    const name = p.symbols.items[ref.innerIndex()].original_name;
                    const args = call.args.slice();
                    if (bun.strings.hasPrefixComptime(name, "__parabunRangeInclusive")) {
                        return StreamSource{ .range_incl = .{ .lo = args[0], .hi = args[1] } };
                    }
                    if (bun.strings.hasPrefixComptime(name, "__parabunRange")) {
                        return StreamSource{ .range_excl = .{ .lo = args[0], .hi = args[1] } };
                    }
                }
            }
            return StreamSource{ .array = source };
        }

        // Recognize a `|>` rhs as a stream-pipeline terminal. Returns the
        // terminal kind on success; null if rhs is not a known terminal.
        fn recognizeStreamTerminal(p: *P, rhs: Expr) ?StreamTerminal {
            switch (rhs.data) {
                .e_identifier => |id| {
                    const name = p.loadNameFromRef(id.ref);
                    if (bun.strings.eqlComptime(name, "sum")) return .sum;
                    if (bun.strings.eqlComptime(name, "count")) return .count;
                    if (bun.strings.eqlComptime(name, "min")) return .min;
                    if (bun.strings.eqlComptime(name, "max")) return .max;
                    if (bun.strings.eqlComptime(name, "collect")) return .collect;
                    if (bun.strings.eqlComptime(name, "toArray")) return .collect;
                    return null;
                },
                .e_call => |call| {
                    if (call.target.data != .e_identifier) return null;
                    const name = p.loadNameFromRef(call.target.data.e_identifier.ref);
                    const args = call.args.slice();
                    if (bun.strings.eqlComptime(name, "forEach") and args.len == 1) {
                        return StreamTerminal{ .for_each = args[0] };
                    }
                    if (bun.strings.eqlComptime(name, "reduce") and args.len == 2) {
                        return StreamTerminal{ .reduce_call = .{ .init = args[0], .fold = args[1] } };
                    }
                    if (bun.strings.eqlComptime(name, "find") and args.len == 1) {
                        return StreamTerminal{ .find = args[0] };
                    }
                    if (bun.strings.eqlComptime(name, "findIndex") and args.len == 1) {
                        return StreamTerminal{ .find_index = args[0] };
                    }
                    if (bun.strings.eqlComptime(name, "some") and args.len == 1) {
                        return StreamTerminal{ .some = args[0] };
                    }
                    if (bun.strings.eqlComptime(name, "every") and args.len == 1) {
                        return StreamTerminal{ .every = args[0] };
                    }
                    return null;
                },
                else => return null,
            }
        }

        // Recognize a "bare" step expression — `map(f)` / `filter(g)` /
        // `take(n)` as the |> rhs BEFORE it's applied to anything. Used by
        // the default-collect path: when a chain ends with one of these
        // and no more |> follows, treat as if the user had written
        // `... |> step |> collect`.
        fn recognizeBareStep(p: *P, rhs: Expr) ?StreamStep {
            if (rhs.data != .e_call) return null;
            const call = rhs.data.e_call;
            if (call.target.data != .e_identifier) return null;
            const args = call.args.slice();
            if (args.len != 1) return null;
            const name = p.loadNameFromRef(call.target.data.e_identifier.ref);
            if (bun.strings.eqlComptime(name, "map")) {
                return .{ .kind = .map, .fn_or_pred = args[0] };
            }
            if (bun.strings.eqlComptime(name, "filter")) {
                return .{ .kind = .filter, .fn_or_pred = args[0] };
            }
            if (bun.strings.eqlComptime(name, "take")) {
                return .{ .kind = .take, .fn_or_pred = args[0] };
            }
            return null;
        }

        // Try to extract a single intermediate step from the outermost shape
        // of `expr`. The expected shape after the existing |> desugar is
        // `combinator(arg)(prevChain)` — an outer call whose target is
        // itself a call to a known combinator name. On a match, returns the
        // step plus the source (prevChain).
        fn recognizeStreamStep(p: *P, expr: Expr) ?struct { step: StreamStep, source: Expr } {
            if (expr.data != .e_call) return null;
            const outer = expr.data.e_call;
            const outer_args = outer.args.slice();
            if (outer_args.len != 1) return null;
            if (outer.target.data != .e_call) return null;
            const cb_call = outer.target.data.e_call;
            const cb_args = cb_call.args.slice();
            if (cb_args.len != 1) return null;
            if (cb_call.target.data != .e_identifier) return null;
            const name = p.loadNameFromRef(cb_call.target.data.e_identifier.ref);
            if (bun.strings.eqlComptime(name, "map")) {
                return .{
                    .step = .{ .kind = .map, .fn_or_pred = cb_args[0] },
                    .source = outer_args[0],
                };
            }
            if (bun.strings.eqlComptime(name, "filter")) {
                return .{
                    .step = .{ .kind = .filter, .fn_or_pred = cb_args[0] },
                    .source = outer_args[0],
                };
            }
            if (bun.strings.eqlComptime(name, "take")) {
                return .{
                    .step = .{ .kind = .take, .fn_or_pred = cb_args[0] },
                    .source = outer_args[0],
                };
            }
            return null;
        }

        // ─── Compile-time pipeline evaluation ───────────────────────────────
        // When the source is a literal (array of literals, or a fully-numeric
        // range) AND every step body + terminal evaluates at parse time,
        // replace the entire chain with the computed result. No for-loop is
        // emitted; the chain becomes a single literal. Bails on anything
        // non-evaluable.
        const ConstValue = union(enum) {
            number: f64,
            boolean: bool,
            string: []const u8,
            undef,
            nul,
        };

        fn boolOf(v: ConstValue) bool {
            return switch (v) {
                .number => |n| n != 0 and !std.math.isNan(n),
                .boolean => |b| b,
                .string => |s| s.len != 0,
                .undef, .nul => false,
            };
        }

        fn evalToExpr(p: *P, v: ConstValue, loc: logger.Loc) Expr {
            return switch (v) {
                .number => |n| p.newExpr(E.Number{ .value = n }, loc),
                .boolean => |b| p.newExpr(E.Boolean{ .value = b }, loc),
                .string => |s| p.newExpr(E.String{ .data = s }, loc),
                .undef => p.newExpr(E.Undefined{}, loc),
                .nul => p.newExpr(E.Null{}, loc),
            };
        }

        fn evalLiteralExpr(expr: Expr) ?ConstValue {
            return switch (expr.data) {
                .e_number => |n| ConstValue{ .number = n.value },
                .e_boolean => |b| ConstValue{ .boolean = b.value },
                .e_string => |s| if (s.next == null) ConstValue{ .string = s.data } else null,
                .e_undefined => .undef,
                .e_null => .nul,
                // `-3` parses as e_unary(neg, e_number(3)) — recognize it as
                // the literal -3 so array sources like `[1, -3, 5]` fold.
                .e_unary => |un| switch (un.op) {
                    .un_neg => switch (un.value.data) {
                        .e_number => |n| ConstValue{ .number = -n.value },
                        else => null,
                    },
                    .un_pos => switch (un.value.data) {
                        .e_number => |n| ConstValue{ .number = n.value },
                        else => null,
                    },
                    else => null,
                },
                else => null,
            };
        }

        // Recursively evaluate `expr` with `param_name` bound to `param_val`.
        // Returns null if any sub-expression isn't constant-evaluable.
        fn evalConst(p: *P, expr: Expr, param_name: []const u8, param_val: ConstValue) ?ConstValue {
            switch (expr.data) {
                .e_number => |n| return ConstValue{ .number = n.value },
                .e_boolean => |b| return ConstValue{ .boolean = b.value },
                .e_string => |s| return if (s.next == null) ConstValue{ .string = s.data } else null,
                .e_undefined => return .undef,
                .e_null => return .nul,
                .e_identifier => |id| {
                    const name = p.loadNameFromRef(id.ref);
                    if (bun.strings.eql(name, param_name)) return param_val;
                    return null;
                },
                .e_unary => |un| {
                    const v = evalConst(p, un.value, param_name, param_val) orelse return null;
                    return switch (un.op) {
                        .un_neg => switch (v) {
                            .number => |n| ConstValue{ .number = -n },
                            else => null,
                        },
                        .un_pos => switch (v) {
                            .number => v,
                            else => null,
                        },
                        .un_not => ConstValue{ .boolean = !boolOf(v) },
                        else => null,
                    };
                },
                .e_binary => |bin| {
                    // Short-circuit && / || before evaluating the right side.
                    if (bin.op == .bin_logical_and) {
                        const l = evalConst(p, bin.left, param_name, param_val) orelse return null;
                        if (!boolOf(l)) return l;
                        return evalConst(p, bin.right, param_name, param_val);
                    }
                    if (bin.op == .bin_logical_or) {
                        const l = evalConst(p, bin.left, param_name, param_val) orelse return null;
                        if (boolOf(l)) return l;
                        return evalConst(p, bin.right, param_name, param_val);
                    }
                    if (bin.op == .bin_nullish_coalescing) {
                        const l = evalConst(p, bin.left, param_name, param_val) orelse return null;
                        return switch (l) {
                            .undef, .nul => evalConst(p, bin.right, param_name, param_val),
                            else => l,
                        };
                    }
                    const l = evalConst(p, bin.left, param_name, param_val) orelse return null;
                    const r = evalConst(p, bin.right, param_name, param_val) orelse return null;
                    // Numeric ops on numbers.
                    if (l == .number and r == .number) {
                        const lv = l.number;
                        const rv = r.number;
                        return switch (bin.op) {
                            .bin_add => ConstValue{ .number = lv + rv },
                            .bin_sub => ConstValue{ .number = lv - rv },
                            .bin_mul => ConstValue{ .number = lv * rv },
                            .bin_div => ConstValue{ .number = lv / rv },
                            .bin_rem => ConstValue{ .number = @rem(lv, rv) },
                            .bin_pow => ConstValue{ .number = std.math.pow(f64, lv, rv) },
                            .bin_lt => ConstValue{ .boolean = lv < rv },
                            .bin_le => ConstValue{ .boolean = lv <= rv },
                            .bin_gt => ConstValue{ .boolean = lv > rv },
                            .bin_ge => ConstValue{ .boolean = lv >= rv },
                            .bin_loose_eq, .bin_strict_eq => ConstValue{ .boolean = lv == rv },
                            .bin_loose_ne, .bin_strict_ne => ConstValue{ .boolean = lv != rv },
                            .bin_bitwise_and => ConstValue{ .number = @floatFromInt(@as(i32, @intFromFloat(lv)) & @as(i32, @intFromFloat(rv))) },
                            .bin_bitwise_or => ConstValue{ .number = @floatFromInt(@as(i32, @intFromFloat(lv)) | @as(i32, @intFromFloat(rv))) },
                            .bin_bitwise_xor => ConstValue{ .number = @floatFromInt(@as(i32, @intFromFloat(lv)) ^ @as(i32, @intFromFloat(rv))) },
                            else => null,
                        };
                    }
                    // String concat / equality.
                    if (l == .string and r == .string) {
                        return switch (bin.op) {
                            .bin_loose_eq, .bin_strict_eq => ConstValue{ .boolean = bun.strings.eql(l.string, r.string) },
                            .bin_loose_ne, .bin_strict_ne => ConstValue{ .boolean = !bun.strings.eql(l.string, r.string) },
                            .bin_add => blk: {
                                const buf = p.allocator.alloc(u8, l.string.len + r.string.len) catch return null;
                                @memcpy(buf[0..l.string.len], l.string);
                                @memcpy(buf[l.string.len..], r.string);
                                break :blk ConstValue{ .string = buf };
                            },
                            else => null,
                        };
                    }
                    return null;
                },
                .e_if => |cond| {
                    const t = evalConst(p, cond.test_, param_name, param_val) orelse return null;
                    return if (boolOf(t))
                        evalConst(p, cond.yes, param_name, param_val)
                    else
                        evalConst(p, cond.no, param_name, param_val);
                },
                else => return null,
            }
        }

        // Extract the (single param-name, body Expr) pair from a step's
        // function arg if it qualifies for inline-style evaluation.
        // Pure functions registered in `pure_inline_fns` qualify too.
        fn extractEvalable(p: *P, fn_expr: Expr) ?struct { name: []const u8, body: Expr } {
            switch (fn_expr.data) {
                .e_arrow => |arrow| {
                    if (arrow.args.len != 1) return null;
                    if (arrow.args[0].default != null) return null;
                    if (arrow.args[0].binding.data != .b_identifier) return null;
                    if (arrow.body.stmts.len != 1) return null;
                    if (arrow.body.stmts[0].data != .s_return) return null;
                    const body = arrow.body.stmts[0].data.s_return.value orelse return null;
                    return .{
                        .name = p.loadNameFromRef(arrow.args[0].binding.data.b_identifier.ref),
                        .body = body,
                    };
                },
                .e_identifier => |id| {
                    const name = p.loadNameFromRef(id.ref);
                    for (p.pure_inline_fns.items) |info| {
                        if (bun.strings.eql(info.fn_name, name)) {
                            return .{ .name = info.param_name, .body = info.body_expr };
                        }
                    }
                    return null;
                },
                else => return null,
            }
        }

        // Pre-pass before buildFusedReduce. Returns a literal Expr if the
        // entire chain folds at parse time; null otherwise (caller falls
        // through to the runtime for-loop emit).
        fn tryConstantFoldPipeline(
            p: *P,
            source: StreamSource,
            steps: []const StreamStep,
            terminal: StreamTerminal,
            loc: logger.Loc,
        ) ?Expr {
            // Materialize the source as a slice of ConstValues. Cap the
            // expansion so a `0..1_000_000` chain doesn't fold at parse time
            // and bloat the output.
            const fold_limit: usize = 1024;
            var elems_buf: [fold_limit]ConstValue = undefined;
            var elem_count: usize = 0;

            switch (source) {
                .array => |arr_expr| {
                    if (arr_expr.data != .e_array) return null;
                    const items = arr_expr.data.e_array.items.slice();
                    if (items.len > fold_limit) return null;
                    for (items) |item| {
                        const v = evalLiteralExpr(item) orelse return null;
                        elems_buf[elem_count] = v;
                        elem_count += 1;
                    }
                },
                .range_excl => |r| {
                    if (r.lo.data != .e_number or r.hi.data != .e_number) return null;
                    const lo = r.lo.data.e_number.value;
                    const hi = r.hi.data.e_number.value;
                    if (lo != @floor(lo) or hi != @floor(hi)) return null;
                    const start: i64 = @intFromFloat(lo);
                    const end: i64 = @intFromFloat(hi);
                    if (end < start) return null;
                    const span: usize = @intCast(end - start);
                    if (span > fold_limit) return null;
                    var ii: i64 = start;
                    while (ii < end) : (ii += 1) {
                        elems_buf[elem_count] = ConstValue{ .number = @floatFromInt(ii) };
                        elem_count += 1;
                    }
                },
                .range_incl => |r| {
                    if (r.lo.data != .e_number or r.hi.data != .e_number) return null;
                    const lo = r.lo.data.e_number.value;
                    const hi = r.hi.data.e_number.value;
                    if (lo != @floor(lo) or hi != @floor(hi)) return null;
                    const start: i64 = @intFromFloat(lo);
                    const end: i64 = @as(i64, @intFromFloat(hi)) + 1;
                    if (end < start) return null;
                    const span: usize = @intCast(end - start);
                    if (span > fold_limit) return null;
                    var ii: i64 = start;
                    while (ii < end) : (ii += 1) {
                        elems_buf[elem_count] = ConstValue{ .number = @floatFromInt(ii) };
                        elem_count += 1;
                    }
                },
            }

            const elems = elems_buf[0..elem_count];

            // Pre-extract step (param_name, body) — bail if any step has a
            // non-evaluable shape (multi-stmt body, multi-param, named
            // non-pure fn, etc.).
            var step_bodies_buf: [16]struct {
                kind: StreamStepKind,
                fn_or_pred: Expr, // for .take, this is the count expr
                name: []const u8 = "",
                body: Expr = undefined,
                has_body: bool = false,
            } = undefined;
            for (steps, 0..) |step, idx| {
                step_bodies_buf[idx] = .{ .kind = step.kind, .fn_or_pred = step.fn_or_pred };
                if (step.kind == .take) continue;
                const ev = extractEvalable(p, step.fn_or_pred) orelse return null;
                step_bodies_buf[idx].name = ev.name;
                step_bodies_buf[idx].body = ev.body;
                step_bodies_buf[idx].has_body = true;
            }
            // Walk each source element through the steps, applying the
            // terminal's accumulator at the end.
            var acc: ConstValue = switch (terminal) {
                .sum, .count => ConstValue{ .number = 0 },
                .min => ConstValue{ .number = std.math.inf(f64) },
                .max => ConstValue{ .number = -std.math.inf(f64) },
                .find, .for_each => .undef,
                .find_index => ConstValue{ .number = -1 },
                .some => ConstValue{ .boolean = false },
                .every => ConstValue{ .boolean = true },
                .collect => ConstValue{ .number = 0 }, // sentinel; collect uses a separate items buffer
                .reduce_call => return null, // skip — fold body may not be evaluable
            };

            // For collect: accumulate ConstValue items, then materialize
            // an array literal at the end.
            var collect_buf: [fold_limit]ConstValue = undefined;
            var collect_len: usize = 0;

            // Per-take counters.
            var take_counts: [16]i64 = .{0} ** 16;

            var i: usize = 0;
            element_loop: while (i < elems.len) : (i += 1) {
                var v: ConstValue = elems[i];
                var step_take_idx: usize = 0;
                for (step_bodies_buf[0..steps.len]) |step_info| {
                    switch (step_info.kind) {
                        .map => {
                            const new_v = evalConst(p, step_info.body, step_info.name, v) orelse return null;
                            v = new_v;
                        },
                        .filter => {
                            const test_v = evalConst(p, step_info.body, step_info.name, v) orelse return null;
                            if (!boolOf(test_v)) continue :element_loop;
                        },
                        .take => {
                            const n_expr = step_info.fn_or_pred;
                            if (n_expr.data != .e_number) return null;
                            const n_f = n_expr.data.e_number.value;
                            if (n_f != @floor(n_f) or n_f < 0) return null;
                            const n: i64 = @intFromFloat(n_f);
                            if (take_counts[step_take_idx] >= n) break :element_loop;
                            take_counts[step_take_idx] += 1;
                            step_take_idx += 1;
                        },
                    }
                }

                // Per-element terminal update.
                switch (terminal) {
                    .sum => {
                        if (v != .number or acc != .number) return null;
                        acc = ConstValue{ .number = acc.number + v.number };
                    },
                    .count => {
                        acc = ConstValue{ .number = acc.number + 1 };
                    },
                    .min => {
                        if (v != .number or acc != .number) return null;
                        if (v.number < acc.number) acc = v;
                    },
                    .max => {
                        if (v != .number or acc != .number) return null;
                        if (v.number > acc.number) acc = v;
                    },
                    .find => |pred_expr| {
                        const ev = extractEvalable(p, pred_expr) orelse return null;
                        const t = evalConst(p, ev.body, ev.name, v) orelse return null;
                        if (boolOf(t)) {
                            acc = v;
                            break :element_loop;
                        }
                    },
                    .find_index => |pred_expr| {
                        const ev = extractEvalable(p, pred_expr) orelse return null;
                        const t = evalConst(p, ev.body, ev.name, v) orelse return null;
                        if (boolOf(t)) {
                            acc = ConstValue{ .number = @floatFromInt(i) };
                            break :element_loop;
                        }
                    },
                    .some => |pred_expr| {
                        const ev = extractEvalable(p, pred_expr) orelse return null;
                        const t = evalConst(p, ev.body, ev.name, v) orelse return null;
                        if (boolOf(t)) {
                            acc = ConstValue{ .boolean = true };
                            break :element_loop;
                        }
                    },
                    .every => |pred_expr| {
                        const ev = extractEvalable(p, pred_expr) orelse return null;
                        const t = evalConst(p, ev.body, ev.name, v) orelse return null;
                        if (!boolOf(t)) {
                            acc = ConstValue{ .boolean = false };
                            break :element_loop;
                        }
                    },
                    .collect => {
                        if (collect_len >= fold_limit) return null;
                        collect_buf[collect_len] = v;
                        collect_len += 1;
                    },
                    .for_each, .reduce_call => return null,
                }
            }

            // Materialize the result as a literal Expr.
            if (terminal == .collect) {
                const arr_items = p.allocator.alloc(Expr, collect_len) catch return null;
                for (collect_buf[0..collect_len], 0..) |item, j| {
                    arr_items[j] = evalToExpr(p, item, loc);
                }
                return p.newExpr(E.Array{
                    .items = ExprNodeList.fromOwnedSlice(arr_items),
                    .is_single_line = collect_len <= 4,
                }, loc);
            }
            return evalToExpr(p, acc, loc);
        }

        // Parabun: stream-pipeline fusion. `src |> map(f) |> filter(g) |> sum`
        // (and the other terminals supported by recognizeStreamTerminal)
        // collapses into `src.reduce((__pa, __px) => { ... }, init)` so the
        // intermediate per-step arrays / call frames disappear into a single
        // pass over the source.
        //
        // Recognition is conservative: only a fixed set of combinator NAMES
        // (map, filter; sum, count, collect, toArray, forEach, reduce). If
        // any step is unrecognized — or if the chain has no intermediate
        // steps — we fall through to the regular |> desugaring.
        //
        // The synthesized arrow uses `let __pv = __px;` + per-step mutation /
        // early-return so each map fn evaluates exactly once even when a
        // filter follows. acc, elem, val symbols are uniquely numbered via
        // p.temp_ref_count to avoid collision with user names.
        fn tryFuseStreamPipeline(p: *P, left: *Expr, rhs: Expr) bool {
            // Recognize an explicit terminal (`sum`, `find(pred)`, etc.) OR
            // fall to the default-collect path: rhs is a step combinator
            // (`map(f)` / `filter(g)` / `take(n)`) AND no more |> follows
            // — treat the chain as if the user had written `… |> collect`.
            // The trailing step from rhs becomes the outermost (last-applied)
            // step in the chain.
            var trailing_step: ?StreamStep = null;
            const terminal: StreamTerminal = blk: {
                if (recognizeStreamTerminal(p, rhs)) |t| break :blk t;
                if (p.lexer.token != .t_bar_greater_than) {
                    if (recognizeBareStep(p, rhs)) |step| {
                        trailing_step = step;
                        break :blk .collect;
                    }
                }
                return false;
            };

            var steps_buf: [16]StreamStep = undefined;
            var steps_len: u32 = 0;
            // Trailing step (from default-collect path) is the outermost
            // step semantically — prepended in walk order so the post-
            // reverse application order ends with it.
            if (trailing_step) |ts| {
                steps_buf[0] = ts;
                steps_len = 1;
            }
            var current = left.*;
            while (steps_len < steps_buf.len) {
                const found = recognizeStreamStep(p, current) orelse break;
                steps_buf[steps_len] = found.step;
                steps_len += 1;
                current = found.source;
            }

            // Bail on chains longer than the static buffer.
            if (steps_len == steps_buf.len) return false;
            // Zero-step fusion: only worthwhile for terminals that themselves
            // do real iteration / early-exit work (find/findIndex/some/every/
            // min/max/forEach). For sum/count/collect/reduce-call with no
            // intermediates, the existing call-wrapping desugar produces
            // equivalent code, so don't bother.
            if (steps_len == 0) {
                switch (terminal) {
                    .find, .find_index, .some, .every, .min, .max, .for_each => {},
                    else => return false,
                }
            }

            // Source classification + shape filter. Range calls
            // (`__parabunRange(a, b)` / inclusive variant) are accepted
            // even though they're calls — the classifier extracts the
            // bounds and the emitter runs the for-loop directly between
            // them, no intermediate range object materializes.
            const source = classifyStreamSource(p, current);
            switch (source) {
                .range_excl, .range_incl => {},
                .array => switch (current.data) {
                    .e_identifier,
                    .e_dot,
                    .e_index,
                    .e_array,
                    => {},
                    // Call sources (other than range helpers) may yield
                    // async iterables — `@para/pipeline` handles those at
                    // runtime via its own combinators, so leave them alone.
                    else => return false,
                },
            }

            // We walked outer→source; the application order is the reverse.
            std.mem.reverse(StreamStep, steps_buf[0..steps_len]);

            // Compile-time fold first. If the source is a literal array /
            // numeric range AND every step body + terminal evaluates at parse
            // time, the chain becomes a single literal — no for-loop emit.
            if (tryConstantFoldPipeline(p, source, steps_buf[0..steps_len], terminal, left.loc)) |folded| {
                // Inline arrows in the chain (in any step's fn_or_pred or
                // the terminal's pred call) are orphaned — their scopes
                // were pushed during chain parse and would mismatch on
                // visit. Null any scope whose loc falls inside the
                // chain's source range.
                const chain_lo = left.loc.start;
                const chain_hi = p.lexer.loc().start;
                for (p.scopes_in_order.items, 0..) |entry_opt, idx| {
                    const entry = entry_opt orelse continue;
                    if (entry.loc.start >= chain_lo and entry.loc.start < chain_hi) {
                        p.scopes_in_order.items[idx] = null;
                    }
                }
                left.* = folded;
                return true;
            }

            return buildFusedReduce(p, left, source, steps_buf[0..steps_len], terminal);
        }

        // Helper: try to inline `fn_expr(arg_expr)` by substituting the
        // body of fn_expr inline. Works for inline arrows / function exprs
        // with a single binding-identifier parameter and a single-return
        // body. Also handles named identifiers registered in
        // pure_inline_fns. Returns null when the call can't be inlined
        // (caller falls back to emitting a regular function call).
        //
        // Eliminates the per-element call frame that
        //   __pv = ((x) => x * x)(__pv);
        // would otherwise produce — collapses to `__pv = __pv * __pv;`.
        //
        // On success for an inline arrow / function expr, the substituted
        // function is no longer reachable from the AST. Its scope-tree
        // entries (function_args + function_body) are orphans — they'd
        // sit in scopes_in_order at the wrong position, and a subsequent
        // chain's visit walk would mismatch on them. nullArrowScopes
        // walks scopes_in_order at the arrow's own locs and clears them.
        fn tryInlineFnCall(p: *P, fn_expr: Expr, arg_expr: Expr) ?Expr {
            switch (fn_expr.data) {
                .e_arrow => |arrow| {
                    if (arrow.args.len != 1) return null;
                    if (arrow.args[0].default != null) return null;
                    if (arrow.args[0].binding.data != .b_identifier) return null;
                    if (arrow.body.stmts.len != 1) return null;
                    if (arrow.body.stmts[0].data != .s_return) return null;
                    const body = arrow.body.stmts[0].data.s_return.value orelse return null;
                    const param_name = p.loadNameFromRef(arrow.args[0].binding.data.b_identifier.ref);
                    const out = substituteByName(p, body, param_name, arg_expr) orelse return null;
                    nullArrowScopes(p, fn_expr.loc, arrow.body.loc);
                    return out;
                },
                .e_function => |fexpr| {
                    if (fexpr.func.args.len != 1) return null;
                    if (fexpr.func.args[0].default != null) return null;
                    if (fexpr.func.args[0].binding.data != .b_identifier) return null;
                    if (fexpr.func.body.stmts.len != 1) return null;
                    if (fexpr.func.body.stmts[0].data != .s_return) return null;
                    const body = fexpr.func.body.stmts[0].data.s_return.value orelse return null;
                    const param_name = p.loadNameFromRef(fexpr.func.args[0].binding.data.b_identifier.ref);
                    const out = substituteByName(p, body, param_name, arg_expr) orelse return null;
                    nullArrowScopes(p, fn_expr.loc, fexpr.func.body.loc);
                    return out;
                },
                .e_identifier => |id| {
                    const name = p.loadNameFromRef(id.ref);
                    for (p.pure_inline_fns.items) |info| {
                        if (bun.strings.eql(info.fn_name, name)) {
                            const inlined = substituteByName(p, info.body_expr, info.param_name, arg_expr) orelse return null;
                            p.pure_fusion_consumed_names.put(p.allocator, info.fn_name, {}) catch {};
                            return inlined;
                        }
                    }
                    return null;
                },
                else => return null,
            }
        }

        // Helper: null out scopes_in_order entries at the given locs.
        // Used after tryInlineFnCall substitutes an inline arrow / fn
        // expression — the arrow's args + body scopes are no longer
        // anchored to any AST node, and visit's sequential walk would
        // mismatch on them. prepareForVisitPass filters nulls out.
        fn nullArrowScopes(p: *P, args_loc: logger.Loc, body_loc: logger.Loc) void {
            const scopes = p.scopes_in_order.items;
            var i: usize = 0;
            while (i < scopes.len) : (i += 1) {
                const entry = scopes[i] orelse continue;
                if (entry.loc.start == args_loc.start or entry.loc.start == body_loc.start) {
                    p.scopes_in_order.items[i] = null;
                }
            }
        }

        // Helper: build `fn(__pv)` either inlined (when fn body is a single
        // return) or as a regular call. Used by the early-exit terminals
        // (find/findIndex/some/every) which need the predicate's truth
        // value without the IIFE call frame the inline form would otherwise
        // have left behind.
        fn inlinedOrCall(p: *P, fn_expr: Expr, val_ref: js_ast.Ref, loc: logger.Loc) !Expr {
            const arg_expr = p.newExpr(E.Identifier{ .ref = val_ref }, loc);
            if (tryInlineFnCall(p, fn_expr, arg_expr)) |inlined| return inlined;
            const args = try p.allocator.alloc(Expr, 1);
            args[0] = p.newExpr(E.Identifier{ .ref = val_ref }, loc);
            return p.newExpr(E.Call{
                .target = fn_expr,
                .args = ExprNodeList.fromOwnedSlice(args),
            }, loc);
        }

        // Helper: build a single-decl `let NAME = VALUE;` statement.
        fn buildLet(p: *P, ref: js_ast.Ref, value: Expr, loc: logger.Loc) !Stmt {
            const decls = try p.allocator.alloc(G.Decl, 1);
            decls[0] = .{
                .binding = p.b(B.Identifier{ .ref = ref }, loc),
                .value = value,
            };
            return p.s(S.Local{
                .kind = .k_let,
                .decls = G.Decl.List.fromOwnedSlice(decls),
            }, loc);
        }

        // Construct an IIFE-wrapped `for` loop and overwrite `*left` with
        // it. Shape:
        //
        //   ((__src) => {
        //     let __acc = INIT;
        //     let __i = 0;
        //     let __pv;
        //     for (; __i < __src.length; __i++) {
        //       __pv = __src[__i];
        //       __pv = f(__pv);              // map step
        //       if (!g(__pv)) continue;      // filter step
        //       __acc = __acc + __pv;        // terminal (per-element)
        //     }
        //     return __acc;
        //   })(srcExpr)
        //
        // Why a for loop instead of `.reduce`: cold call sites and
        // megamorphic chains don't get the reducer callback inlined, so
        // each element pays a real call frame. A direct for-loop is
        // reliably fast across V8/JSC. The IIFE wrapper costs one call
        // frame per chain (vs N) — net win, and lets the result sit in
        // expression position without a stmt-level rewrite.
        fn buildFusedReduce(p: *P, left: *Expr, source: StreamSource, steps: []const StreamStep, terminal: StreamTerminal) bool {
            // Snapshot scopes_in_order length + the original chain-start loc
            // before we touch anything — we'll use both to do scope-tree
            // surgery once the synth scopes are pushed and *left is rewritten.
            const scope_order_len_before = p.scopes_in_order.items.len;
            const chain_start = left.loc.start;
            // The scope our synth arrow will be a child of — same as whatever
            // the chain's inline-arrow scopes were parented to (current_scope
            // hasn't moved during chain parse since |> doesn't open a scope).
            const outer_scope = p.current_scope;

            // pushScopeForParsePass enforces strictly-increasing locs across
            // every scope in the file, so synth scope locs must be later
            // than any scope already pushed during this parse — including
            // any inline-arrow scopes the chain registered. Use the lexer's
            // current loc (just past the terminal token) for args; offsets
            // +1/+2/+3 for the body, the for's own `.block` (every S.For
            // visit pushes one at S.For.loc), and the for-body S.Block.
            const args_loc = p.lexer.loc();
            const body_loc = logger.Loc{ .start = args_loc.start + 1 };
            const for_outer_loc = logger.Loc{ .start = args_loc.start + 2 };
            const for_body_loc = logger.Loc{ .start = args_loc.start + 3 };

            p.temp_ref_count += 1;
            const counter = p.temp_ref_count;
            const acc_name = std.fmt.allocPrint(p.allocator, "__pa_{x}$", .{counter}) catch return false;
            const i_name = std.fmt.allocPrint(p.allocator, "__pi_{x}$", .{counter}) catch return false;
            const val_name = std.fmt.allocPrint(p.allocator, "__pv_{x}$", .{counter}) catch return false;

            const is_range = switch (source) {
                .array => false,
                .range_excl, .range_incl => true,
            };

            // Track which steps use take so we can declare a count symbol
            // only when needed. Each take step gets its own counter — chains
            // with `|> take(3) |> filter |> take(2)` need independent counts.
            var take_count: u32 = 0;
            for (steps) |step| {
                if (step.kind == .take) take_count += 1;
            }

            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_args, args_loc) catch return false;
            // IIFE arg refs vary by source kind:
            //   array: 1 param `__src` — accessed via `__src.length` / `__src[__i]`
            //   range: 2 params `__plo, __phi` — used as the loop bounds.
            const src_ref: js_ast.Ref = if (!is_range) blk: {
                const src_name = std.fmt.allocPrint(p.allocator, "__ps_{x}$", .{counter}) catch return false;
                break :blk p.declareSymbol(.hoisted, args_loc, src_name) catch return false;
            } else js_ast.Ref.None;
            const lo_ref: js_ast.Ref = if (is_range) blk: {
                const lo_name = std.fmt.allocPrint(p.allocator, "__plo_{x}$", .{counter}) catch return false;
                break :blk p.declareSymbol(.hoisted, args_loc, lo_name) catch return false;
            } else js_ast.Ref.None;
            const hi_ref: js_ast.Ref = if (is_range) blk: {
                const hi_name = std.fmt.allocPrint(p.allocator, "__phi_{x}$", .{counter}) catch return false;
                break :blk p.declareSymbol(.hoisted, args_loc, hi_name) catch return false;
            } else js_ast.Ref.None;

            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_body, body_loc) catch return false;
            const synth_body_scope = p.current_scope;
            const acc_ref = p.declareSymbol(.other, body_loc, acc_name) catch return false;
            const i_ref = p.declareSymbol(.other, body_loc, i_name) catch return false;
            const val_ref = p.declareSymbol(.other, body_loc, val_name) catch return false;

            // Per-take counter refs (one per take step in chain order).
            const take_refs: []js_ast.Ref = if (take_count > 0)
                p.allocator.alloc(js_ast.Ref, take_count) catch return false
            else
                &[_]js_ast.Ref{};
            {
                var k: u32 = 0;
                while (k < take_count) : (k += 1) {
                    const tname = std.fmt.allocPrint(p.allocator, "__pc{d}_{x}$", .{ k, counter }) catch return false;
                    take_refs[k] = p.declareSymbol(.other, body_loc, tname) catch return false;
                }
            }

            // S.For's visit pushes a `.block` for its own scope at S.For.loc;
            // the inner S.Block (body) pushes another `.block` at its own loc.
            // Pre-declare both at parse time so visit iteration matches.
            // No declarations needed in either — references to __pv / __acc /
            // __i climb to synth_body via the parent chain.
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.block, for_outer_loc) catch return false;
            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.block, for_body_loc) catch return false;
            const for_body_scope = p.current_scope;

            // Top-level body stmts: let __acc, let __i, [let __pcN]*, let __pv, for(...), return.
            var body_stmts = ListManaged(Stmt).initCapacity(p.allocator, 5 + take_count) catch return false;

            // Init value per terminal — the starting __acc value.
            const acc_init: Expr = switch (terminal) {
                .sum, .count => p.newExpr(E.Number{ .value = 0.0 }, body_loc),
                .reduce_call => |r| r.init,
                .for_each => p.newExpr(E.Undefined{}, body_loc),
                .collect => p.newExpr(E.Array{
                    .items = ExprNodeList{},
                    .is_single_line = true,
                }, body_loc),
                .find => p.newExpr(E.Undefined{}, body_loc),
                .find_index => p.newExpr(E.Number{ .value = -1.0 }, body_loc),
                .some => p.newExpr(E.Boolean{ .value = false }, body_loc),
                .every => p.newExpr(E.Boolean{ .value = true }, body_loc),
                .min => p.newExpr(E.Number{ .value = std.math.inf(f64) }, body_loc),
                .max => p.newExpr(E.Number{ .value = -std.math.inf(f64) }, body_loc),
            };

            // let __acc = INIT;
            body_stmts.appendAssumeCapacity(buildLet(p, acc_ref, acc_init, body_loc) catch return false);
            // let __i = 0;        (array source — index from 0)
            // let __i = __plo;    (range source — counter starts at lo)
            const i_init_expr: Expr = if (is_range)
                p.newExpr(E.Identifier{ .ref = lo_ref }, body_loc)
            else
                p.newExpr(E.Number{ .value = 0.0 }, body_loc);
            body_stmts.appendAssumeCapacity(buildLet(p, i_ref, i_init_expr, body_loc) catch return false);
            // let __pcN = 0; for each take step.
            for (take_refs) |take_ref| {
                body_stmts.appendAssumeCapacity(buildLet(p, take_ref, p.newExpr(E.Number{ .value = 0.0 }, body_loc), body_loc) catch return false);
            }
            // let __pv; (no initializer)
            {
                const decls = p.allocator.alloc(G.Decl, 1) catch return false;
                decls[0] = .{
                    .binding = p.b(B.Identifier{ .ref = val_ref }, body_loc),
                    .value = null,
                };
                body_stmts.appendAssumeCapacity(p.s(S.Local{
                    .kind = .k_let,
                    .decls = G.Decl.List.fromOwnedSlice(decls),
                }, body_loc));
            }

            // for (; __i < __src.length; __i++) { ... loop body ... }
            // Capacity: initial `__pv = __src[__i];` (1) + up to 2 stmts per
            // step (take emits `if (...) break;` plus `__pcN++;`) + up to
            // 2 stmts for the terminal (find/findIndex/some/every emit two
            // if-statements).
            var loop_stmts = ListManaged(Stmt).initCapacity(p.allocator, 3 + steps.len * 2) catch return false;

            // __pv = __src[__i];   (array source)
            // __pv = __i;          (range source — value IS the counter)
            {
                const rhs_expr: Expr = if (is_range)
                    p.newExpr(E.Identifier{ .ref = i_ref }, body_loc)
                else
                    p.newExpr(E.Index{
                        .target = p.newExpr(E.Identifier{ .ref = src_ref }, body_loc),
                        .index = p.newExpr(E.Identifier{ .ref = i_ref }, body_loc),
                    }, body_loc);
                const assign = p.newExpr(E.Binary{
                    .op = .bin_assign,
                    .left = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc),
                    .right = rhs_expr,
                }, body_loc);
                loop_stmts.appendAssumeCapacity(p.s(S.SExpr{ .value = assign }, body_loc));
            }

            // Per-step lowering. For each step, we first try to inline the
            // combinator function's body directly (substituting __pv for the
            // param in a single-return body). Inline arrows and pure-inline
            // named functions both qualify. Falls back to a regular call
            // when the function can't be inlined (multi-param, multi-stmt
            // body, etc.).
            var take_idx: u32 = 0;
            for (steps) |step| {
                switch (step.kind) {
                    .map => {
                        const arg_expr = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc);
                        const call_or_inline: Expr = if (tryInlineFnCall(p, step.fn_or_pred, arg_expr)) |inlined| inlined else blk: {
                            const call_args = p.allocator.alloc(Expr, 1) catch return false;
                            call_args[0] = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc);
                            break :blk p.newExpr(E.Call{
                                .target = step.fn_or_pred,
                                .args = ExprNodeList.fromOwnedSlice(call_args),
                            }, body_loc);
                        };
                        // __pv = call_or_inline;
                        const assign = p.newExpr(E.Binary{
                            .op = .bin_assign,
                            .left = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc),
                            .right = call_or_inline,
                        }, body_loc);
                        loop_stmts.appendAssumeCapacity(p.s(S.SExpr{ .value = assign }, body_loc));
                    },
                    .filter => {
                        const arg_expr = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc);
                        const call_or_inline: Expr = if (tryInlineFnCall(p, step.fn_or_pred, arg_expr)) |inlined| inlined else blk: {
                            const call_args = p.allocator.alloc(Expr, 1) catch return false;
                            call_args[0] = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc);
                            break :blk p.newExpr(E.Call{
                                .target = step.fn_or_pred,
                                .args = ExprNodeList.fromOwnedSlice(call_args),
                            }, body_loc);
                        };
                        // if (!call_or_inline) continue;
                        const not_expr = p.newExpr(E.Unary{
                            .op = .un_not,
                            .value = call_or_inline,
                        }, body_loc);
                        const yes_stmt = p.s(S.Continue{ .label = null }, body_loc);
                        loop_stmts.appendAssumeCapacity(p.s(S.If{
                            .test_ = not_expr,
                            .yes = yes_stmt,
                            .no = null,
                        }, body_loc));
                    },
                    .take => {
                        // take(n): elements that *reach* this step are counted.
                        // Once n have passed through, break out of the loop —
                        // subsequent steps and the terminal don't see further
                        // elements.
                        //
                        //   if (__pcK >= n) break;
                        //   __pcK++;
                        const take_ref = take_refs[take_idx];
                        take_idx += 1;
                        const test_expr = p.newExpr(E.Binary{
                            .op = .bin_ge,
                            .left = p.newExpr(E.Identifier{ .ref = take_ref }, body_loc),
                            .right = step.fn_or_pred,
                        }, body_loc);
                        const break_stmt = p.s(S.Break{ .label = null }, body_loc);
                        loop_stmts.appendAssumeCapacity(p.s(S.If{
                            .test_ = test_expr,
                            .yes = break_stmt,
                            .no = null,
                        }, body_loc));
                        const inc_expr = p.newExpr(E.Unary{
                            .op = .un_post_inc,
                            .value = p.newExpr(E.Identifier{ .ref = take_ref }, body_loc),
                        }, body_loc);
                        loop_stmts.appendAssumeCapacity(p.s(S.SExpr{ .value = inc_expr }, body_loc));
                    },
                }
            }

            // Terminal step (per-element accumulator update).
            switch (terminal) {
                .sum => {
                    // __acc = __acc + __pv;
                    const add = p.newExpr(E.Binary{
                        .op = .bin_add,
                        .left = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        .right = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc),
                    }, body_loc);
                    const assign = p.newExpr(E.Binary{
                        .op = .bin_assign,
                        .left = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        .right = add,
                    }, body_loc);
                    loop_stmts.appendAssumeCapacity(p.s(S.SExpr{ .value = assign }, body_loc));
                },
                .count => {
                    // __acc = __acc + 1;
                    const add = p.newExpr(E.Binary{
                        .op = .bin_add,
                        .left = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        .right = p.newExpr(E.Number{ .value = 1.0 }, body_loc),
                    }, body_loc);
                    const assign = p.newExpr(E.Binary{
                        .op = .bin_assign,
                        .left = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        .right = add,
                    }, body_loc);
                    loop_stmts.appendAssumeCapacity(p.s(S.SExpr{ .value = assign }, body_loc));
                },
                .reduce_call => |r| {
                    // __acc = fold(__acc, __pv);
                    const fold_args = p.allocator.alloc(Expr, 2) catch return false;
                    fold_args[0] = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc);
                    fold_args[1] = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc);
                    const fold_call = p.newExpr(E.Call{
                        .target = r.fold,
                        .args = ExprNodeList.fromOwnedSlice(fold_args),
                    }, body_loc);
                    const assign = p.newExpr(E.Binary{
                        .op = .bin_assign,
                        .left = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        .right = fold_call,
                    }, body_loc);
                    loop_stmts.appendAssumeCapacity(p.s(S.SExpr{ .value = assign }, body_loc));
                },
                .for_each => |fn_expr| {
                    // fn_expr(__pv);
                    const fe_args = p.allocator.alloc(Expr, 1) catch return false;
                    fe_args[0] = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc);
                    const fe_call = p.newExpr(E.Call{
                        .target = fn_expr,
                        .args = ExprNodeList.fromOwnedSlice(fe_args),
                    }, body_loc);
                    loop_stmts.appendAssumeCapacity(p.s(S.SExpr{ .value = fe_call }, body_loc));
                },
                .collect => {
                    // __acc.push(__pv);
                    const push_args = p.allocator.alloc(Expr, 1) catch return false;
                    push_args[0] = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc);
                    const push_call = p.newExpr(E.Call{
                        .target = p.newExpr(E.Dot{
                            .target = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                            .name = "push",
                            .name_loc = body_loc,
                        }, body_loc),
                        .args = ExprNodeList.fromOwnedSlice(push_args),
                    }, body_loc);
                    loop_stmts.appendAssumeCapacity(p.s(S.SExpr{ .value = push_call }, body_loc));
                },
                .find => |pred| {
                    // Two stmts (no Block to avoid an extra scope push):
                    //   if (pred(__pv)) __acc = __pv;
                    //   if (pred(__pv)) break;
                    // Predicate is evaluated twice; for inlined arrows /
                    // pure-fns this is free, and the contract for these
                    // combinators presumes pure predicates anyway.
                    const t1 = inlinedOrCall(p, pred, val_ref, body_loc) catch return false;
                    const t2 = inlinedOrCall(p, pred, val_ref, body_loc) catch return false;
                    const assign = p.newExpr(E.Binary{
                        .op = .bin_assign,
                        .left = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        .right = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc),
                    }, body_loc);
                    loop_stmts.appendAssumeCapacity(p.s(S.If{
                        .test_ = t1,
                        .yes = p.s(S.SExpr{ .value = assign }, body_loc),
                        .no = null,
                    }, body_loc));
                    loop_stmts.appendAssumeCapacity(p.s(S.If{
                        .test_ = t2,
                        .yes = p.s(S.Break{ .label = null }, body_loc),
                        .no = null,
                    }, body_loc));
                },
                .find_index => |pred| {
                    const t1 = inlinedOrCall(p, pred, val_ref, body_loc) catch return false;
                    const t2 = inlinedOrCall(p, pred, val_ref, body_loc) catch return false;
                    const assign = p.newExpr(E.Binary{
                        .op = .bin_assign,
                        .left = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        .right = p.newExpr(E.Identifier{ .ref = i_ref }, body_loc),
                    }, body_loc);
                    loop_stmts.appendAssumeCapacity(p.s(S.If{
                        .test_ = t1,
                        .yes = p.s(S.SExpr{ .value = assign }, body_loc),
                        .no = null,
                    }, body_loc));
                    loop_stmts.appendAssumeCapacity(p.s(S.If{
                        .test_ = t2,
                        .yes = p.s(S.Break{ .label = null }, body_loc),
                        .no = null,
                    }, body_loc));
                },
                .some => |pred| {
                    const t1 = inlinedOrCall(p, pred, val_ref, body_loc) catch return false;
                    const t2 = inlinedOrCall(p, pred, val_ref, body_loc) catch return false;
                    const assign = p.newExpr(E.Binary{
                        .op = .bin_assign,
                        .left = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        .right = p.newExpr(E.Boolean{ .value = true }, body_loc),
                    }, body_loc);
                    loop_stmts.appendAssumeCapacity(p.s(S.If{
                        .test_ = t1,
                        .yes = p.s(S.SExpr{ .value = assign }, body_loc),
                        .no = null,
                    }, body_loc));
                    loop_stmts.appendAssumeCapacity(p.s(S.If{
                        .test_ = t2,
                        .yes = p.s(S.Break{ .label = null }, body_loc),
                        .no = null,
                    }, body_loc));
                },
                .every => |pred| {
                    const t1_inner = inlinedOrCall(p, pred, val_ref, body_loc) catch return false;
                    const t1 = p.newExpr(E.Unary{ .op = .un_not, .value = t1_inner }, body_loc);
                    const t2_inner = inlinedOrCall(p, pred, val_ref, body_loc) catch return false;
                    const t2 = p.newExpr(E.Unary{ .op = .un_not, .value = t2_inner }, body_loc);
                    const assign = p.newExpr(E.Binary{
                        .op = .bin_assign,
                        .left = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        .right = p.newExpr(E.Boolean{ .value = false }, body_loc),
                    }, body_loc);
                    loop_stmts.appendAssumeCapacity(p.s(S.If{
                        .test_ = t1,
                        .yes = p.s(S.SExpr{ .value = assign }, body_loc),
                        .no = null,
                    }, body_loc));
                    loop_stmts.appendAssumeCapacity(p.s(S.If{
                        .test_ = t2,
                        .yes = p.s(S.Break{ .label = null }, body_loc),
                        .no = null,
                    }, body_loc));
                },
                .min => {
                    // if (__pv < __acc) __acc = __pv;
                    const cmp = p.newExpr(E.Binary{
                        .op = .bin_lt,
                        .left = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc),
                        .right = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                    }, body_loc);
                    const assign = p.newExpr(E.Binary{
                        .op = .bin_assign,
                        .left = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        .right = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc),
                    }, body_loc);
                    loop_stmts.appendAssumeCapacity(p.s(S.If{
                        .test_ = cmp,
                        .yes = p.s(S.SExpr{ .value = assign }, body_loc),
                        .no = null,
                    }, body_loc));
                },
                .max => {
                    // if (__pv > __acc) __acc = __pv;
                    const cmp = p.newExpr(E.Binary{
                        .op = .bin_gt,
                        .left = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc),
                        .right = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                    }, body_loc);
                    const assign = p.newExpr(E.Binary{
                        .op = .bin_assign,
                        .left = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        .right = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc),
                    }, body_loc);
                    loop_stmts.appendAssumeCapacity(p.s(S.If{
                        .test_ = cmp,
                        .yes = p.s(S.SExpr{ .value = assign }, body_loc),
                        .no = null,
                    }, body_loc));
                },
            }

            // Assemble for-loop and append to body.
            // array source:    __i < __src.length
            // range_excl:      __i < __phi
            // range_incl:      __i <= __phi
            const for_test = blk: {
                const left_expr = p.newExpr(E.Identifier{ .ref = i_ref }, body_loc);
                switch (source) {
                    .array => break :blk p.newExpr(E.Binary{
                        .op = .bin_lt,
                        .left = left_expr,
                        .right = p.newExpr(E.Dot{
                            .target = p.newExpr(E.Identifier{ .ref = src_ref }, body_loc),
                            .name = "length",
                            .name_loc = body_loc,
                        }, body_loc),
                    }, body_loc),
                    .range_excl => break :blk p.newExpr(E.Binary{
                        .op = .bin_lt,
                        .left = left_expr,
                        .right = p.newExpr(E.Identifier{ .ref = hi_ref }, body_loc),
                    }, body_loc),
                    .range_incl => break :blk p.newExpr(E.Binary{
                        .op = .bin_le,
                        .left = left_expr,
                        .right = p.newExpr(E.Identifier{ .ref = hi_ref }, body_loc),
                    }, body_loc),
                }
            };
            const for_update = p.newExpr(E.Unary{
                .op = .un_post_inc,
                .value = p.newExpr(E.Identifier{ .ref = i_ref }, body_loc),
            }, body_loc);
            const for_body = p.s(S.Block{
                .stmts = loop_stmts.toOwnedSlice() catch return false,
            }, for_body_loc);
            body_stmts.appendAssumeCapacity(p.s(S.For{
                .init = null,
                .test_ = for_test,
                .update = for_update,
                .body = for_body,
            }, for_outer_loc));

            // return __acc;
            body_stmts.appendAssumeCapacity(p.s(S.Return{
                .value = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
            }, body_loc));

            p.popScope(); // for_body block
            p.popScope(); // for_outer block
            p.popScope(); // synth_body
            p.popScope(); // synth_args

            // Arrow + IIFE shape varies by source:
            //   array:        ((__src) => { ... })(srcExpr)
            //   range_*:      ((__plo, __phi) => { ... })(loExpr, hiExpr)
            const arg_count: usize = if (is_range) 2 else 1;
            const arrow_args = p.allocator.alloc(G.Arg, arg_count) catch return false;
            const call_args = p.allocator.alloc(Expr, arg_count) catch return false;
            switch (source) {
                .array => |src_expr| {
                    arrow_args[0] = .{ .binding = p.b(B.Identifier{ .ref = src_ref }, args_loc) };
                    call_args[0] = src_expr;
                },
                .range_excl => |r| {
                    arrow_args[0] = .{ .binding = p.b(B.Identifier{ .ref = lo_ref }, args_loc) };
                    arrow_args[1] = .{ .binding = p.b(B.Identifier{ .ref = hi_ref }, args_loc) };
                    call_args[0] = r.lo;
                    call_args[1] = r.hi;
                },
                .range_incl => |r| {
                    arrow_args[0] = .{ .binding = p.b(B.Identifier{ .ref = lo_ref }, args_loc) };
                    arrow_args[1] = .{ .binding = p.b(B.Identifier{ .ref = hi_ref }, args_loc) };
                    call_args[0] = r.lo;
                    call_args[1] = r.hi;
                },
            }

            const arrow = p.newExpr(E.Arrow{
                .args = arrow_args,
                .body = .{ .loc = body_loc, .stmts = body_stmts.toOwnedSlice() catch return false },
                .prefer_expr = false,
                .is_async = false,
                .is_para_fusion_iife = true,
            }, args_loc);

            const iife_call = p.newExpr(E.Call{
                .target = arrow,
                .args = ExprNodeList.fromOwnedSlice(call_args),
            }, args_loc);

            left.* = iife_call;

            // ─── Scope-tree surgery ────────────────────────────────────
            // Four synth scopes (args / body / for-outer-block / for-body-block)
            // were pushed at the *end* of scopes_in_order with late locs,
            // but AST traversal will reach them BEFORE the chain's inline-
            // arrow scopes (which we parsed earlier and which now sit inside
            // the for-body block). Re-thread two invariants:
            //
            //   1. scopes_in_order order: move the synth quad to just before
            //      the chain's earliest scope so visit's sequential walk
            //      matches AST order.
            //
            //   2. scope.parent links: chain's outermost arrow scopes were
            //      parented to outer_scope at parse time (siblings of
            //      synth_args). Re-parent each such scope to for_body_scope —
            //      the actual lexical parent in the post-fusion AST.
            const synth_scope_count: usize = 4;
            {
                const scopes = &p.scopes_in_order;
                const len = scopes.items.len;
                if (len < scope_order_len_before + synth_scope_count) return true;
                const synth_args_entry = scopes.items[len - 4];
                const synth_body_entry = scopes.items[len - 3];
                const for_outer_entry = scopes.items[len - 2];
                const for_body_entry = scopes.items[len - 1];

                var insert_at: usize = scope_order_len_before;
                var i: usize = 0;
                while (i < scope_order_len_before) : (i += 1) {
                    const entry = scopes.items[i] orelse continue;
                    if (entry.loc.start >= chain_start) {
                        insert_at = i;
                        break;
                    }
                }

                if (insert_at < scope_order_len_before) {
                    // Re-parent chain scopes whose .parent == outer_scope to
                    // for_body_scope (the immediate enclosing scope after
                    // fusion).
                    var k: usize = insert_at;
                    while (k < scope_order_len_before) : (k += 1) {
                        const entry = scopes.items[k] orelse continue;
                        if (entry.scope.parent == outer_scope) {
                            entry.scope.parent = for_body_scope;
                        }
                    }
                    // Move synth quad from end → insert_at position.
                    var j: usize = len;
                    while (j > insert_at + synth_scope_count) : (j -= 1) {
                        scopes.items[j - 1] = scopes.items[j - 1 - synth_scope_count];
                    }
                    scopes.items[insert_at] = synth_args_entry;
                    scopes.items[insert_at + 1] = synth_body_entry;
                    scopes.items[insert_at + 2] = for_outer_entry;
                    scopes.items[insert_at + 3] = for_body_entry;
                }
            }
            _ = synth_body_scope;

            return true;
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
                    .t_dot_dot,
                    .t_dot_dot_equals,
                    .t_dot_dot_exclamation,
                    .t_dot_dot_ampersand,
                    .t_dot_dot_greater_than,
                    .t_bar_greater_than,
                    .t_tilde_greater_than,
                    .t_minus_greater_than,
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

const std = @import("std");
const ListManaged = std.array_list.Managed;
const bun = @import("bun");

const logger = bun.logger;
const strings = bun.strings;

const js_ast = bun.ast;
const B = js_ast.B;
const E = js_ast.E;
const G = js_ast.G;
const S = js_ast.S;
const Expr = js_ast.Expr;
const Stmt = js_ast.Stmt;
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
