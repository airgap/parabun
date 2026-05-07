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
            reduce_call: struct { init: Expr, fold: Expr },
            for_each: Expr, // forEach(fn) — fn is the callback
            collect, // collect / toArray — accumulate into array
        };

        const StreamStepKind = enum { map, filter };
        const StreamStep = struct { kind: StreamStepKind, fn_or_pred: Expr };

        // Recognize a `|>` rhs as a stream-pipeline terminal. Returns the
        // terminal kind on success; null if rhs is not a known terminal.
        fn recognizeStreamTerminal(p: *P, rhs: Expr) ?StreamTerminal {
            switch (rhs.data) {
                .e_identifier => |id| {
                    const name = p.loadNameFromRef(id.ref);
                    if (bun.strings.eqlComptime(name, "sum")) return .sum;
                    if (bun.strings.eqlComptime(name, "count")) return .count;
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
                    return null;
                },
                else => return null,
            }
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
            // Limit fusion to combinator args that don't introduce their
            // own scopes (no inline arrows, no inline function expressions).
            // Embedding e.g. `map(x => x*2)`'s arrow inside a synth arrow's
            // body breaks the parser's parse-order==visit-order invariant on
            // scopes_in_order — supporting it cleanly needs scope-tree
            // surgery we're punting on. Identifiers (named fns), member
            // access, and calls are fine.
            switch (cb_args[0].data) {
                .e_arrow, .e_function => return null,
                else => {},
            }
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
            return null;
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
            const terminal = recognizeStreamTerminal(p, rhs) orelse return false;

            var steps_buf: [16]StreamStep = undefined;
            var steps_len: u32 = 0;
            var current = left.*;
            while (steps_len < steps_buf.len) {
                const found = recognizeStreamStep(p, current) orelse break;
                steps_buf[steps_len] = found.step;
                steps_len += 1;
                current = found.source;
            }

            // No intermediate transforms means there's nothing to fuse —
            // the existing call-wrapping desugar already handles that case.
            if (steps_len == 0) return false;
            // Bail on chains longer than the static buffer.
            if (steps_len == steps_buf.len) return false;

            // Source-shape filter. The fused output emits `source.reduce(...)`,
            // which assumes `source` is array-like. Conservative: only fuse
            // when the source is provably-arrayish syntax. This excludes call
            // expressions like `source()` (which may return an async iterable
            // — the @para/pipeline library handles those at runtime via its
            // own combinators), `await x`, and other indeterminate shapes.
            switch (current.data) {
                .e_identifier,
                .e_dot,
                .e_index,
                .e_array,
                => {},
                else => return false,
            }

            // We walked outer→source; the application order is the reverse.
            std.mem.reverse(StreamStep, steps_buf[0..steps_len]);

            return buildFusedReduce(p, left, current, steps_buf[0..steps_len], terminal);
        }

        // Construct `source.reduce((__pa_N, __px_N) => { ... }, init)` and
        // overwrite `*left` with it. The body is built using `let __pv_N`
        // for value flow + statement-level steps (so each map fn runs
        // exactly once even when filter follows).
        fn buildFusedReduce(p: *P, left: *Expr, source: Expr, steps: []const StreamStep, terminal: StreamTerminal) bool {
            // Combinator args were filtered to non-arrow / non-function in
            // recognizeStreamStep, so the chain hasn't pushed any scopes —
            // synth-arrow scopes can use a loc derived from the chain's
            // start without violating pushScopeForParsePass's monotonic-
            // increase check.
            const args_loc = p.lexer.loc();
            const body_loc = logger.Loc{ .start = args_loc.start + 1 };

            p.temp_ref_count += 1;
            const counter = p.temp_ref_count;
            const acc_name = std.fmt.allocPrint(p.allocator, "__pa_{x}$", .{counter}) catch return false;
            const elem_name = std.fmt.allocPrint(p.allocator, "__px_{x}$", .{counter}) catch return false;
            const val_name = std.fmt.allocPrint(p.allocator, "__pv_{x}$", .{counter}) catch return false;

            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_args, args_loc) catch return false;
            const acc_ref = p.declareSymbol(.hoisted, args_loc, acc_name) catch return false;
            const elem_ref = p.declareSymbol(.hoisted, args_loc, elem_name) catch return false;

            _ = p.pushScopeForParsePass(js_ast.Scope.Kind.function_body, body_loc) catch return false;
            const val_ref = p.declareSymbol(.other, body_loc, val_name) catch return false;

            var stmts = ListManaged(Stmt).initCapacity(p.allocator, steps.len + 3) catch return false;

            // let __pv = __px;
            {
                const decls = p.allocator.alloc(G.Decl, 1) catch return false;
                decls[0] = .{
                    .binding = p.b(B.Identifier{ .ref = val_ref }, body_loc),
                    .value = p.newExpr(E.Identifier{ .ref = elem_ref }, body_loc),
                };
                stmts.appendAssumeCapacity(p.s(S.Local{
                    .kind = .k_let,
                    .decls = G.Decl.List.fromOwnedSlice(decls),
                }, body_loc));
            }

            // Per-step lowering:
            //   map(f):    __pv = f(__pv);
            //   filter(g): if (!g(__pv)) return __pa;
            for (steps) |step| {
                switch (step.kind) {
                    .map => {
                        const call_args = p.allocator.alloc(Expr, 1) catch return false;
                        call_args[0] = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc);
                        const call_expr = p.newExpr(E.Call{
                            .target = step.fn_or_pred,
                            .args = ExprNodeList.fromOwnedSlice(call_args),
                        }, body_loc);
                        const assign = p.newExpr(E.Binary{
                            .op = .bin_assign,
                            .left = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc),
                            .right = call_expr,
                        }, body_loc);
                        stmts.appendAssumeCapacity(p.s(S.SExpr{ .value = assign }, body_loc));
                    },
                    .filter => {
                        const call_args = p.allocator.alloc(Expr, 1) catch return false;
                        call_args[0] = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc);
                        const call_expr = p.newExpr(E.Call{
                            .target = step.fn_or_pred,
                            .args = ExprNodeList.fromOwnedSlice(call_args),
                        }, body_loc);
                        const not_expr = p.newExpr(E.Unary{
                            .op = .un_not,
                            .value = call_expr,
                        }, body_loc);
                        const yes_stmt = p.s(S.Return{
                            .value = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        }, body_loc);
                        stmts.appendAssumeCapacity(p.s(S.If{
                            .test_ = not_expr,
                            .yes = yes_stmt,
                            .no = null,
                        }, body_loc));
                    },
                }
            }

            // Terminal: build the final `return ...;` (and any preceding
            // side-effect stmt for forEach / collect).
            const terminal_value: Expr = blk: {
                switch (terminal) {
                    .sum => break :blk p.newExpr(E.Binary{
                        .op = .bin_add,
                        .left = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        .right = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc),
                    }, body_loc),
                    .count => break :blk p.newExpr(E.Binary{
                        .op = .bin_add,
                        .left = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc),
                        .right = p.newExpr(E.Number{ .value = 1.0 }, body_loc),
                    }, body_loc),
                    .reduce_call => |r| {
                        const fold_args = p.allocator.alloc(Expr, 2) catch return false;
                        fold_args[0] = p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc);
                        fold_args[1] = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc);
                        break :blk p.newExpr(E.Call{
                            .target = r.fold,
                            .args = ExprNodeList.fromOwnedSlice(fold_args),
                        }, body_loc);
                    },
                    .for_each => |fn_expr| {
                        // fn_expr(__pv); return __pa;
                        const fe_args = p.allocator.alloc(Expr, 1) catch return false;
                        fe_args[0] = p.newExpr(E.Identifier{ .ref = val_ref }, body_loc);
                        const fe_call = p.newExpr(E.Call{
                            .target = fn_expr,
                            .args = ExprNodeList.fromOwnedSlice(fe_args),
                        }, body_loc);
                        stmts.appendAssumeCapacity(p.s(S.SExpr{ .value = fe_call }, body_loc));
                        break :blk p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc);
                    },
                    .collect => {
                        // __pa.push(__pv); return __pa;
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
                        stmts.appendAssumeCapacity(p.s(S.SExpr{ .value = push_call }, body_loc));
                        break :blk p.newExpr(E.Identifier{ .ref = acc_ref }, body_loc);
                    },
                }
            };
            stmts.appendAssumeCapacity(p.s(S.Return{ .value = terminal_value }, body_loc));

            p.popScope();
            p.popScope();

            // Arrow params and the arrow itself.
            const arrow_args = p.allocator.alloc(G.Arg, 2) catch return false;
            arrow_args[0] = .{ .binding = p.b(B.Identifier{ .ref = acc_ref }, args_loc) };
            arrow_args[1] = .{ .binding = p.b(B.Identifier{ .ref = elem_ref }, args_loc) };

            const arrow = p.newExpr(E.Arrow{
                .args = arrow_args,
                .body = .{ .loc = body_loc, .stmts = stmts.toOwnedSlice() catch return false },
                .prefer_expr = false,
                .is_async = false,
            }, args_loc);

            // Init value per terminal.
            const init_value: Expr = switch (terminal) {
                .sum, .count => p.newExpr(E.Number{ .value = 0.0 }, args_loc),
                .reduce_call => |r| r.init,
                .for_each => p.newExpr(E.Undefined{}, args_loc),
                .collect => p.newExpr(E.Array{
                    .items = ExprNodeList{},
                    .is_single_line = true,
                }, args_loc),
            };

            // Build `source.reduce(arrow, init)`.
            const reduce_args = p.allocator.alloc(Expr, 2) catch return false;
            reduce_args[0] = arrow;
            reduce_args[1] = init_value;
            const reduce_call = p.newExpr(E.Call{
                .target = p.newExpr(E.Dot{
                    .target = source,
                    .name = "reduce",
                    .name_loc = args_loc,
                }, args_loc),
                .args = ExprNodeList.fromOwnedSlice(reduce_args),
            }, args_loc);

            left.* = reduce_call;
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
