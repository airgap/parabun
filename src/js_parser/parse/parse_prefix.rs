#![allow(clippy::single_match)]
#![warn(unused_must_use)]
use bun_collections::VecExt;

use crate::lexer::T;
use crate::p::P;
use crate::parser::{
    AsyncPrefixExpression, AwaitOrYield, DeferredErrors, FnOrArrowDataParse, ParenExprOpts,
    ParseClassOptions, PropertyOpts, SkipTypeParameterResult, TypeParameterFlag, prefill,
};
use bun_ast::e::UnaryFlags;
use bun_ast::expr::EFlags;
use bun_ast::g::{Arg, PropertyKind};
use bun_ast::op::Level;
use bun_ast::{
    self as js_ast, ArrayBinding, B, E, Expr, ExprData, ExprNodeList, G, OpCode, S, Stmt, scope,
    symbol,
};

// TODO(port): narrow error set — Zig used `anyerror!Expr` throughout
type PResult<T> = core::result::Result<T, bun_core::Error>;

/// One arm of a `match` expression, carrying both lowering forms so the final
/// pass can pick ternary vs. switch. `literals` is `Some` only for pure-literal
/// patterns (usable as switch case labels); `tag` is `Some` for Result/Option
/// constructor patterns; `is_wildcard` marks `_`/`else`/bare bind.
struct MatchArmMeta<'a> {
    test_expr: Option<bun_ast::Expr>,
    result: bun_ast::Expr,
    literals: Option<&'a [bun_ast::Expr]>,
    is_wildcard: bool,
    tag: Option<&'a [u8]>,
}

// Zig: `fn ParsePrefix(comptime ts, comptime jsx, comptime scan_only) type { return struct { ... } }`
// — file-split mixin pattern. Round-C lowered `const JSX: JSXTransformType` → `J: JsxT`, so this is
// a direct `impl P` block. The 30+ per-token `t_*` helpers are private; only `parse_prefix` is
// surfaced. Round-G un-gates the per-token bodies (same JsxT pattern as parseStmt.rs); helper
// names pfx_-prefixed to avoid colliding with parseStmt.rs / parseSuffix.rs mixins on the same `P`.

impl<'a, const TYPESCRIPT: bool, const SCAN_ONLY: bool> P<'a, TYPESCRIPT, SCAN_ONLY> {
    fn pfx_t_super(p: &mut Self, level: Level) -> PResult<Expr> {
        let loc = p.lexer.loc();
        let super_range = p.lexer.range();
        p.lexer.next()?;

        match p.lexer.token {
            T::TOpenParen => {
                if level.lt(Level::Call) && p.fn_or_arrow_data_parse.allow_super_call {
                    return Ok(p.new_expr(E::Super {}, loc));
                }
            }
            T::TDot | T::TOpenBracket => {
                if p.fn_or_arrow_data_parse.allow_super_property {
                    return Ok(p.new_expr(E::Super {}, loc));
                }
            }
            _ => {}
        }

        p.log()
            .add_range_error(Some(p.source), super_range, b"Unexpected \"super\"");
        Ok(p.new_expr(E::Super {}, loc))
    }

    fn pfx_t_open_paren(p: &mut Self, level: Level) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;

        // Parens are an explicit escape from chain-op RHS terminator behavior:
        // `p ..! err => (recover() ..! fb)` keeps the inner `..!` inside the
        // arrow body rather than terminating it.
        let prev_chain = p.in_chain_op_arrow_rhs;
        p.in_chain_op_arrow_rhs = false;

        // Arrow functions aren't allowed in the middle of expressions
        if level.gt(Level::Assign) {
            // Allow "in" inside parentheses
            let old_allow_in = p.allow_in;
            p.allow_in = true;

            let mut value = p.parse_expr(Level::Lowest)?;
            p.mark_expr_as_parenthesized(&mut value);
            p.lexer.expect(T::TCloseParen)?;

            p.allow_in = old_allow_in;
            p.in_chain_op_arrow_rhs = prev_chain;
            return Ok(value);
        }

        let result = p.parse_paren_expr(loc, level, ParenExprOpts::default());
        p.in_chain_op_arrow_rhs = prev_chain;
        result
    }

    #[inline]
    fn pfx_t_false(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        Ok(p.new_expr(E::Boolean { value: false }, loc))
    }

    #[inline]
    fn pfx_t_true(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        Ok(p.new_expr(E::Boolean { value: true }, loc))
    }

    #[inline]
    fn pfx_t_null(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        Ok(p.new_expr(E::Null {}, loc))
    }

    #[inline]
    fn pfx_t_this(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        if p.fn_or_arrow_data_parse.is_this_disallowed {
            p.log()
                .add_range_error(Some(p.source), p.lexer.range(), b"Cannot use \"this\" here");
        }
        p.lexer.next()?;
        Ok(Expr {
            data: prefill::data::THIS,
            loc,
        })
    }

    fn pfx_t_private_identifier(p: &mut Self, level: Level) -> PResult<Expr> {
        let loc = p.lexer.loc();
        if !p.allow_private_identifiers || !p.allow_in || level.gte(Level::Compare) {
            p.lexer.unexpected()?;
            return Err(bun_core::err!("SyntaxError"));
        }

        let name = p.lexer.identifier;
        p.lexer.next()?;

        // Check for "#foo in bar"
        if p.lexer.token != T::TIn {
            p.lexer.expected(T::TIn)?;
        }

        let ref_ = p.store_name_in_ref(name)?;
        Ok(p.new_expr(E::PrivateIdentifier { ref_ }, loc))
    }

    // Parabun: `Tag(value)` → `{ tag: <tag>, <value_key>: value }`.
    fn parse_result_ctor(
        p: &mut Self,
        tag_name: &'static [u8],
        value_key: &'static [u8],
        loc: bun_ast::Loc,
    ) -> PResult<Expr> {
        p.lexer.expect(T::TOpenParen)?;
        let value = p.parse_expr(Level::Comma)?;
        p.lexer.expect(T::TCloseParen)?;

        let mut properties: bun_alloc::ArenaVec<'_, G::Property> =
            bun_alloc::ArenaVec::new_in(p.arena);
        let tag_key = p.new_expr(E::EString::init(b"tag"), loc);
        let tag_val = p.new_expr(E::EString::init(tag_name), loc);
        properties.push(G::Property {
            key: Some(tag_key),
            value: Some(tag_val),
            ..Default::default()
        });
        let vkey = p.new_expr(E::EString::init(value_key), loc);
        properties.push(G::Property {
            key: Some(vkey),
            value: Some(value),
            ..Default::default()
        });
        Ok(p.new_expr(
            E::Object {
                properties: G::PropertyList::from_bump_vec(properties),
                ..Default::default()
            },
            loc,
        ))
    }

    // Parabun: leading-dot sugar. A bare `.member.chain()` at expression
    // position (argument: `map(.score)`, or chain-op RHS: `..! .message`)
    // synthesizes `(__pcv) => __pcv.member.chain()`. The lexer is at the `.`
    // on entry; the regular suffix loop (run with in_chain_op_arrow_rhs set)
    // consumes the full member/call chain and stops at the next chain op.
    // `op_loc` is the chain-operator loc, or the dot loc itself for the
    // argument-position form.
    pub(crate) fn parse_leading_dot_chain_handler(
        p: &mut Self,
        op_loc: bun_ast::Loc,
    ) -> PResult<Expr> {
        let dot_loc = p.lexer.loc();
        let arrow_loc = if op_loc.start < dot_loc.start {
            op_loc
        } else {
            bun_ast::Loc {
                start: if dot_loc.start > 0 { dot_loc.start - 1 } else { 0 },
            }
        };

        p.push_scope_for_parse_pass(js_ast::scope::Kind::FunctionArgs, arrow_loc)?;
        let param_ref = p.declare_symbol(symbol::Kind::Constant, dot_loc, b"__pcv")?;
        p.push_scope_for_parse_pass(js_ast::scope::Kind::FunctionBody, dot_loc)?;

        // Run the suffix loop on the synthetic param so the leading `.` and any
        // following members/indexes/calls fold into the arrow body.
        let mut body_expr = p.new_expr(E::Identifier::init(param_ref), dot_loc);
        let prev = p.in_chain_op_arrow_rhs;
        p.in_chain_op_arrow_rhs = true;
        p.parse_suffix(&mut body_expr, Level::Assign, None, EFlags::None)?;
        p.in_chain_op_arrow_rhs = prev;

        p.pop_scope(); // FunctionBody
        p.pop_scope(); // FunctionArgs

        let ret_stmt = p.s(S::Return { value: Some(body_expr) }, dot_loc);
        let stmts: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[ret_stmt]);

        let arg_binding = p.b(B::Identifier { r#ref: param_ref }, dot_loc);
        let args: &'a mut [G::Arg] = p.arena.alloc_slice_fill_with(1, |_| G::Arg {
            binding: arg_binding,
            ..Default::default()
        });

        Ok(p.new_expr(
            E::Arrow {
                args: bun_ast::StoreSlice::new_mut(args),
                prefer_expr: true,
                body: G::FnBody {
                    loc: dot_loc,
                    stmts: bun_ast::StoreSlice::new_mut(stmts),
                },
                ..Default::default()
            },
            arrow_loc,
        ))
    }

    // Prefix dispatch for a leading `.` — argument-position form (op_loc == dot).
    fn pfx_t_dot(p: &mut Self, _level: Level) -> PResult<Expr> {
        let dot_loc = p.lexer.loc();
        Self::parse_leading_dot_chain_handler(p, dot_loc)
    }

    // Parabun: `schema { ... }` → `__paraFromSchema(() => ({ ... }))`. The body
    // `{ ... }` parses as an object literal inside a synthesized zero-arg thunk
    // (so its identifier refs belong to the arrow, and the schema is built
    // lazily). At entry: `schema` consumed, lexer on `{`.
    fn parse_schema_object_expr(p: &mut Self, range_loc: bun_ast::Loc) -> PResult<Expr> {
        let body_loc = p.lexer.loc();
        p.push_scope_for_parse_pass(js_ast::scope::Kind::FunctionArgs, range_loc)?;
        p.push_scope_for_parse_pass(js_ast::scope::Kind::FunctionBody, body_loc)?;

        // `.comma` so a `schema { … }` nested in an object literal stops at the
        // outer `,` instead of swallowing it as a sequence expression.
        let body_expr = p.parse_expr(Level::Comma)?;

        let ret = p.s(S::Return { value: Some(body_expr) }, body_loc);
        let stmts: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[ret]);
        let no_args: &'a mut [G::Arg] = p.arena.alloc_slice_fill_with(0, |_| G::Arg::default());
        let thunk = p.new_expr(
            E::Arrow {
                args: bun_ast::StoreSlice::new_mut(no_args),
                prefer_expr: true,
                body: G::FnBody {
                    loc: body_loc,
                    stmts: bun_ast::StoreSlice::new_mut(stmts),
                },
                ..Default::default()
            },
            range_loc,
        );

        p.pop_scope();
        p.pop_scope();

        Ok(p.call_runtime(range_loc, b"__paraFromSchema", ExprNodeList::init_one(thunk)))
    }

    // Parabun: `parallel { k0: v0, k1: v1 }` →
    //   Promise.all([v0, v1]).then(([__pb0, __pb1]) => ({ k0: __pb0, k1: __pb1 }))
    fn parse_parallel_object_expr(p: &mut Self, range_loc: bun_ast::Loc) -> PResult<Expr> {
        p.lexer.expect(T::TOpenBrace)?;

        let mut keys: bun_alloc::ArenaVec<'_, Expr> = bun_alloc::ArenaVec::new_in(p.arena);
        let mut values: bun_alloc::ArenaVec<'_, Expr> = bun_alloc::ArenaVec::new_in(p.arena);
        while p.lexer.token != T::TCloseBrace {
            let key_loc = p.lexer.loc();
            let key = match p.lexer.token {
                T::TIdentifier => {
                    let id = p.lexer.identifier;
                    p.lexer.next()?;
                    p.new_expr(E::EString::init(id), key_loc)
                }
                T::TStringLiteral => {
                    let s = p.lexer.to_e_string()?;
                    p.lexer.next()?;
                    p.new_expr(s, key_loc)
                }
                T::TNumericLiteral => {
                    let num = p.lexer.number;
                    p.lexer.next()?;
                    p.new_expr(E::Number { value: num }, key_loc)
                }
                _ => {
                    p.lexer.expect(T::TIdentifier)?;
                    return Err(bun_core::err!("SyntaxError"));
                }
            };
            p.lexer.expect(T::TColon)?;
            let value = p.parse_expr(Level::Comma)?;
            keys.push(key);
            values.push(value);
            if p.lexer.token != T::TComma {
                break;
            }
            p.lexer.next()?;
        }
        p.lexer.expect(T::TCloseBrace)?;

        // Promise.all([v0, v1, ...])
        let promise_ref = p.store_name_in_ref(b"Promise")?;
        let promise_id = p.new_expr(E::Identifier::init(promise_ref), range_loc);
        let all_dot = p.new_expr(
            E::Dot {
                target: promise_id,
                name: E::Str::new(b"all"),
                name_loc: range_loc,
                ..Default::default()
            },
            range_loc,
        );
        let values_array = p.new_expr(
            E::Array {
                items: ExprNodeList::from_slice(values.as_slice()),
                ..Default::default()
            },
            range_loc,
        );
        let all_call = p.new_expr(
            E::Call {
                target: all_dot,
                args: ExprNodeList::init_one(values_array),
                ..Default::default()
            },
            range_loc,
        );

        // `([__pb…]) => ({ k…: __pb… })` — scope recipe: args@range_loc, body@+1.
        let arrow_loc = range_loc;
        let body_loc = bun_ast::Loc {
            start: range_loc.start + 1,
        };
        p.push_scope_for_parse_pass(js_ast::scope::Kind::FunctionArgs, arrow_loc)?;
        p.push_scope_for_parse_pass(js_ast::scope::Kind::FunctionBody, body_loc)?;

        let n = keys.len();
        let args_slice: &'a mut [G::Arg];
        let obj_expr: Expr;
        if n == 0 {
            args_slice = p.arena.alloc_slice_fill_with(0, |_| G::Arg::default());
            obj_expr = p.new_expr(E::Object::default(), body_loc);
        } else {
            let mut items: bun_alloc::ArenaVec<'_, ArrayBinding> =
                bun_alloc::ArenaVec::new_in(p.arena);
            let mut props: bun_alloc::ArenaVec<'_, G::Property> =
                bun_alloc::ArenaVec::new_in(p.arena);
            for i in 0..n {
                let tmp_name: &'a [u8] = bun_alloc::arena_format!(in p.arena, "__pb{}", i)
                    .into_bump_str()
                    .as_bytes();
                let tmp_ref = p.declare_symbol(symbol::Kind::Constant, body_loc, tmp_name)?;
                let binding = p.b(B::Identifier { r#ref: tmp_ref }, body_loc);
                items.push(ArrayBinding {
                    binding,
                    default_value: None,
                });
                let val_ident = p.new_expr(E::Identifier::init(tmp_ref), body_loc);
                props.push(G::Property {
                    key: Some(keys[i]),
                    value: Some(val_ident),
                    ..Default::default()
                });
            }
            let array_binding = p.b(
                js_ast::b::Array {
                    items: bun_ast::StoreSlice::from_bump(items),
                    has_spread: false,
                    is_single_line: true,
                },
                arrow_loc,
            );
            args_slice = p.arena.alloc_slice_fill_with(1, |_| G::Arg {
                binding: array_binding,
                ..Default::default()
            });
            obj_expr = p.new_expr(
                E::Object {
                    properties: G::PropertyList::from_bump_vec(props),
                    ..Default::default()
                },
                body_loc,
            );
        }

        let ret = p.s(S::Return { value: Some(obj_expr) }, body_loc);
        let stmts: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[ret]);
        let arrow = p.new_expr(
            E::Arrow {
                args: bun_ast::StoreSlice::new_mut(args_slice),
                prefer_expr: true,
                body: G::FnBody {
                    loc: body_loc,
                    stmts: bun_ast::StoreSlice::new_mut(stmts),
                },
                ..Default::default()
            },
            arrow_loc,
        );

        p.pop_scope();
        p.pop_scope();

        let then_dot = p.new_expr(
            E::Dot {
                target: all_call,
                name: E::Str::new(b"then"),
                name_loc: range_loc,
                ..Default::default()
            },
            range_loc,
        );
        Ok(p.new_expr(
            E::Call {
                target: then_dot,
                args: ExprNodeList::init_one(arrow),
                ..Default::default()
            },
            range_loc,
        ))
    }

    // Parabun: `parallel let A = x, B = y;` / `para let …` →
    //   `const [A, B] = await Promise.all([x, y]);`
    // Each initializer parses at comma level so a trailing error-chain
    // (`x ..! null`) folds into the awaited operand. The lexer is positioned
    // at `let`.
    pub(crate) fn t_parallel_let(p: &mut Self, loc: bun_ast::Loc) -> PResult<Stmt> {
        p.lexer.next()?; // consume `let` / `const`
        let mut items: bun_alloc::ArenaVec<'_, ArrayBinding> = bun_alloc::ArenaVec::new_in(p.arena);
        let mut values: bun_alloc::ArenaVec<'_, Expr> = bun_alloc::ArenaVec::new_in(p.arena);
        loop {
            if p.lexer.token != T::TIdentifier {
                p.lexer.expect(T::TIdentifier)?;
            }
            let name_loc = p.lexer.loc();
            let name = p.lexer.identifier;
            let binding_ref = p.declare_symbol(symbol::Kind::Constant, name_loc, name)?;
            p.lexer.next()?;
            // `parallel let x: T = …` — skip the TS annotation.
            if Self::IS_TYPESCRIPT_ENABLED && p.lexer.token == T::TColon {
                p.lexer.expect(T::TColon)?;
                p.skip_type_script_type(Level::Lowest)?;
            }
            p.lexer.expect(T::TEquals)?;
            let value = p.parse_expr(Level::Comma)?;
            let id_binding = p.b(B::Identifier { r#ref: binding_ref }, name_loc);
            items.push(ArrayBinding {
                binding: id_binding,
                default_value: None,
            });
            values.push(value);
            if p.lexer.token != T::TComma {
                break;
            }
            p.lexer.next()?;
        }
        p.lexer.expect_or_insert_semicolon()?;

        let promise_ref = p.store_name_in_ref(b"Promise")?;
        let promise_id = p.new_expr(E::Identifier::init(promise_ref), loc);
        let all_dot = p.new_expr(
            E::Dot {
                target: promise_id,
                name: E::Str::new(b"all"),
                name_loc: loc,
                ..Default::default()
            },
            loc,
        );
        let values_array = p.new_expr(
            E::Array {
                items: ExprNodeList::from_slice(values.as_slice()),
                ..Default::default()
            },
            loc,
        );
        let all_call = p.new_expr(
            E::Call {
                target: all_dot,
                args: ExprNodeList::init_one(values_array),
                ..Default::default()
            },
            loc,
        );
        let await_expr = p.new_expr(E::Await { value: all_call }, loc);
        let array_binding = p.b(
            js_ast::b::Array {
                items: bun_ast::StoreSlice::from_bump(items),
                has_spread: false,
                is_single_line: true,
            },
            loc,
        );
        let decl = G::Decl {
            binding: array_binding,
            value: Some(await_expr),
        };
        Ok(p.s(
            S::Local {
                kind: js_ast::s::Kind::KConst,
                decls: G::DeclList::from_arena_slice(&[decl]),
                ..Default::default()
            },
            loc,
        ))
    }

    // Parabun: `parallel using a = f(), b = g();` (or `await using`) →
    //   const [__pu_0, __pu_1] = await Promise.all([f(), g()]);
    //   using a = __pu_0, b = __pu_1;
    // wrapped in a transparent block so both decls bind in the caller's scope.
    pub(crate) fn parse_parallel_using_stmt(
        p: &mut Self,
        loc: bun_ast::Loc,
        is_export: bool,
        is_await_using: bool,
    ) -> PResult<Stmt> {
        p.lexer.next()?; // consume `using`

        let mut names: smallvec::SmallVec<[(bun_ast::Loc, bun_ast::base::Ref); 4]> =
            smallvec::SmallVec::new();
        let mut values: bun_alloc::ArenaVec<'_, Expr> = bun_alloc::ArenaVec::new_in(p.arena);
        loop {
            if p.lexer.token != T::TIdentifier {
                p.lexer.expect(T::TIdentifier)?;
            }
            let name_loc = p.lexer.loc();
            let name = p.lexer.identifier;
            p.lexer.next()?;
            if Self::IS_TYPESCRIPT_ENABLED && p.lexer.token == T::TColon {
                p.lexer.next()?;
                p.skip_type_script_type(Level::Lowest)?;
            }
            p.lexer.expect(T::TEquals)?;
            let rhs = p.parse_expr(Level::Comma)?;
            let r = p.declare_symbol(symbol::Kind::Constant, name_loc, name)?;
            names.push((name_loc, r));
            values.push(rhs);
            if p.lexer.token != T::TComma {
                break;
            }
            p.lexer.next()?;
        }
        p.lexer.expect_or_insert_semicolon()?;

        // One temp per binding: __pu_<i>.
        let mut temps: smallvec::SmallVec<[bun_ast::base::Ref; 4]> = smallvec::SmallVec::new();
        for i in 0..names.len() {
            let temp_name: &'a [u8] = bun_alloc::arena_format!(in p.arena, "__pu_{}", i)
                .into_bump_str()
                .as_bytes();
            temps.push(p.declare_symbol(symbol::Kind::Constant, loc, temp_name)?);
        }

        // await Promise.all([rhs0, rhs1, ...])
        let promise_ref = p.store_name_in_ref(b"Promise")?;
        let promise_id = p.new_expr(E::Identifier::init(promise_ref), loc);
        let all_dot = p.new_expr(
            E::Dot {
                target: promise_id,
                name: E::Str::new(b"all"),
                name_loc: loc,
                ..Default::default()
            },
            loc,
        );
        let values_array = p.new_expr(
            E::Array {
                items: ExprNodeList::from_slice(values.as_slice()),
                ..Default::default()
            },
            loc,
        );
        let all_call = p.new_expr(
            E::Call {
                target: all_dot,
                args: ExprNodeList::init_one(values_array),
                ..Default::default()
            },
            loc,
        );
        let await_expr = p.new_expr(E::Await { value: all_call }, loc);

        // Statement 1: const [__pu_0, …] = await Promise.all(…)
        let mut items: bun_alloc::ArenaVec<'_, ArrayBinding> = bun_alloc::ArenaVec::new_in(p.arena);
        for t in &temps {
            let b = p.b(B::Identifier { r#ref: *t }, loc);
            items.push(ArrayBinding {
                binding: b,
                default_value: None,
            });
        }
        let array_binding = p.b(
            js_ast::b::Array {
                items: bun_ast::StoreSlice::from_bump(items),
                has_spread: false,
                is_single_line: true,
            },
            loc,
        );
        let const_decl = G::Decl {
            binding: array_binding,
            value: Some(await_expr),
        };
        let const_stmt = p.s(
            S::Local {
                kind: js_ast::s::Kind::KConst,
                decls: G::DeclList::from_arena_slice(&[const_decl]),
                ..Default::default()
            },
            loc,
        );

        // Statement 2: using NAME0 = __pu_0, … (or await using …)
        let mut using_decls: smallvec::SmallVec<[G::Decl; 4]> = smallvec::SmallVec::new();
        for ((nloc, nref), t) in names.iter().zip(temps.iter()) {
            let binding = p.b(B::Identifier { r#ref: *nref }, *nloc);
            let val = p.new_expr(E::Identifier::init(*t), *nloc);
            using_decls.push(G::Decl {
                binding,
                value: Some(val),
            });
        }
        let using_stmt = p.s(
            S::Local {
                kind: if is_await_using {
                    js_ast::s::Kind::KAwaitUsing
                } else {
                    js_ast::s::Kind::KUsing
                },
                decls: G::DeclList::from_arena_slice(&using_decls),
                is_export,
                ..Default::default()
            },
            loc,
        );

        let inner: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[const_stmt, using_stmt]);
        Ok(p.s(
            S::Block {
                stmts: bun_ast::StoreSlice::new_mut(inner),
                is_transparent: true,
                ..Default::default()
            },
            loc,
        ))
    }

    // Parabun: `match SUBJECT { lit => res, ..., else => res }` → an IIFE
    // ternary: `((__pm) => __pm === lit1 ? res1 : ... : elseRes)(SUBJECT)`.
    // Subset: literal patterns + `else`/`_` wildcard. Bindings, OR patterns,
    // Ok/Err/Some/None patterns, `is Type` guards, and the switch (jump-table)
    // lowering are not yet ported.
    #[allow(clippy::too_many_arguments)]
    fn parse_match_expr(p: &mut Self, match_loc: bun_ast::Loc) -> PResult<Expr> {
        let subject = p.parse_expr(Level::Lowest)?;
        p.lexer.expect(T::TOpenBrace)?;

        // Unique IIFE param name per match (so nested matches don't collide).
        p.temp_ref_count += 1;
        let counter = p.temp_ref_count;
        let m_name: &'a [u8] = bun_alloc::arena_format!(in p.arena, "__pm_{:x}$", counter)
            .into_bump_str()
            .as_bytes();

        // Synthesize the IIFE arrow whose single param is the matched value.
        // Scope locs must strictly increase: args at the `match` loc, body one
        // past it, the wrapping block two past it.
        let args_loc = match_loc;
        let body_loc = bun_ast::Loc {
            start: match_loc.start + 1,
        };
        let switch_body_loc = bun_ast::Loc {
            start: match_loc.start + 2,
        };

        p.push_scope_for_parse_pass(js_ast::scope::Kind::FunctionArgs, args_loc)?;
        let m_ref = p.declare_symbol(symbol::Kind::Hoisted, args_loc, m_name)?;
        p.push_scope_for_parse_pass(js_ast::scope::Kind::FunctionBody, body_loc)?;
        // Push the block that wraps the arrow body BEFORE arm parsing and keep
        // it current while arms parse. visit's `s_block`/`s_switch` handler
        // pushes this block right after function_body; if we delayed the push,
        // a nested `match` in an arm RHS would inject scopes BETWEEN body and
        // block at parse-time and visit would diverge (panic "Scope mismatch").
        // Keeping it current also parents inner-arm scopes into the block.
        p.push_scope_for_parse_pass(js_ast::scope::Kind::Block, switch_body_loc)?;

        let arg_binding = p.b(B::Identifier { r#ref: m_ref }, args_loc);
        let args: &'a mut [G::Arg] = p.arena.alloc_slice_fill_with(1, |_| G::Arg {
            binding: arg_binding,
            ..Default::default()
        });

        // What identifier to substitute in the arm result post-parse:
        //   Plain     → bind_name → __pm
        //   DotValue  → bind_name → __pm.value     (Ok(x)/Some(x))
        //   DotError  → bind_name → __pm.error     (Err(e))
        #[derive(Clone, Copy)]
        enum SubKind {
            None,
            Plain,
            DotValue,
            DotError,
        }
        let mut arms: std::vec::Vec<MatchArmMeta<'a>> = std::vec::Vec::new();

        while p.lexer.token != T::TCloseBrace {
            let mut test_expr: Option<Expr> = None;
            let mut bind_name: Option<&'a [u8]> = None;
            let mut sub_kind = SubKind::None;
            let mut literals: Option<&'a [Expr]> = None;
            let mut is_wildcard = false;
            let mut tag: Option<&'a [u8]> = None;

            if (p.lexer.token == T::TIdentifier && p.lexer.raw() == b"_")
                || p.lexer.token == T::TElse
            {
                p.lexer.next()?;
                // `_ is Type` / `_ is not Type` — runtime type-guard arm.
                if p.lexer.token == T::TIdentifier
                    && p.lexer.raw() == b"is"
                    && !p.lexer.has_newline_before
                {
                    test_expr = Self::parse_is_type_test(p, m_ref, args_loc)?;
                    if test_expr.is_none() {
                        is_wildcard = true;
                    }
                } else {
                    is_wildcard = true;
                }
            } else if p.lexer.token == T::TIdentifier
                && matches!(p.lexer.raw(), b"Ok" | b"Some" | b"Err" | b"None")
            {
                let ctor: &'a [u8] = p.lexer.raw();
                p.lexer.next()?;
                test_expr = Some(Self::build_tag_test_expr(p, m_ref, args_loc, ctor));
                tag = Some(ctor);
                if ctor != b"None" {
                    if let Some(bn) = Self::parse_ctor_arg_ident(p)? {
                        bind_name = Some(bn);
                        sub_kind = if ctor == b"Err" {
                            SubKind::DotError
                        } else {
                            SubKind::DotValue
                        };
                    }
                }
            } else if p.lexer.token == T::TIdentifier {
                // Identifier-bind: `n => ...`, optionally `u is Type => ...`.
                bind_name = Some(p.lexer.identifier);
                sub_kind = SubKind::Plain;
                p.lexer.next()?;
                if p.lexer.token == T::TIdentifier
                    && p.lexer.raw() == b"is"
                    && !p.lexer.has_newline_before
                {
                    if let Some(t) = Self::parse_is_type_test(p, m_ref, args_loc)? {
                        test_expr = Some(t);
                    }
                }
            } else {
                // Literal pattern, optionally OR-chained (`1 | 2 | 3`).
                let (test, lits) = Self::build_arm_test_literals(p, m_ref, args_loc)?;
                test_expr = Some(test);
                literals = Some(lits);
            }

            p.lexer.expect(T::TEqualsGreaterThan)?;
            let mut result = p.parse_expr(Level::Comma)?;

            // Substitute the binding name with the captured subject.
            if let Some(bname) = bind_name {
                let replacement = match sub_kind {
                    SubKind::Plain => p.new_expr(E::Identifier::init(m_ref), args_loc),
                    SubKind::DotValue => {
                        let t = p.new_expr(E::Identifier::init(m_ref), args_loc);
                        p.new_expr(
                            E::Dot {
                                target: t,
                                name: E::Str::new(b"value"),
                                name_loc: args_loc,
                                ..Default::default()
                            },
                            args_loc,
                        )
                    }
                    SubKind::DotError => {
                        let t = p.new_expr(E::Identifier::init(m_ref), args_loc);
                        p.new_expr(
                            E::Dot {
                                target: t,
                                name: E::Str::new(b"error"),
                                name_loc: args_loc,
                                ..Default::default()
                            },
                            args_loc,
                        )
                    }
                    SubKind::None => p.new_expr(E::Undefined {}, args_loc),
                };
                if let Some(subbed) = Self::match_substitute_ident(p, result, bname, replacement) {
                    result = subbed;
                }
            }

            arms.push(MatchArmMeta {
                test_expr,
                result,
                literals,
                is_wildcard,
                tag,
            });

            if p.lexer.token == T::TComma {
                p.lexer.next()?;
            } else {
                break;
            }
        }
        p.lexer.expect(T::TCloseBrace)?;

        // Decide lowering form.
        let mut all_literal = true;
        let mut all_tag = true;
        let mut saw_tag = false;
        for arm in &arms {
            if !arm.is_wildcard && arm.literals.is_none() {
                all_literal = false;
            }
            if !arm.is_wildcard && arm.tag.is_none() {
                all_tag = false;
            }
            if arm.tag.is_some() {
                saw_tag = true;
            }
        }
        if !saw_tag {
            all_tag = false;
        }

        p.pop_scope(); // Block
        p.pop_scope(); // FunctionBody
        p.pop_scope(); // FunctionArgs

        let inline = all_literal && Self::is_simple_subject(&subject);

        // Build the arrow body's single statement.
        let body_stmt: Stmt = if inline {
            // Discriminated-union narrowing: test the SUBJECT directly at each
            // site so tsc narrows the parent value.
            let mut fallback = p.new_expr(E::Undefined {}, args_loc);
            let mut first_test = arms.len();
            for (i, arm) in arms.iter().enumerate() {
                if arm.is_wildcard {
                    fallback = arm.result;
                    first_test = i;
                    break;
                }
            }
            let mut chain = fallback;
            let mut i = first_test;
            while i > 0 {
                i -= 1;
                let lits = arms[i].literals.unwrap();
                let mut test = Self::build_subject_eq_lit(p, &subject, lits[0], args_loc);
                for lit in &lits[1..] {
                    let eq = Self::build_subject_eq_lit(p, &subject, *lit, args_loc);
                    test = p.new_expr(
                        E::Binary {
                            op: OpCode::BinLogicalOr,
                            left: test,
                            right: eq,
                        },
                        args_loc,
                    );
                }
                chain = p.new_expr(
                    E::If {
                        test_: test,
                        yes: arms[i].result,
                        no: chain,
                    },
                    args_loc,
                );
            }
            let ret = p.s(S::Return { value: Some(chain) }, switch_body_loc);
            let inner: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[ret]);
            p.s(
                S::Block {
                    stmts: bun_ast::StoreSlice::new_mut(inner),
                    ..Default::default()
                },
                switch_body_loc,
            )
        } else if all_literal {
            Self::build_match_switch_stmt(p, m_ref, args_loc, switch_body_loc, &arms)
        } else if all_tag {
            Self::build_match_tag_switch_stmt(p, m_ref, args_loc, switch_body_loc, &arms)
        } else {
            // Capture-`__pm` ternary chain, wrapped in a block so visit
            // consumes the block scope pushed before arms.
            let mut fallback = p.new_expr(E::Undefined {}, args_loc);
            let mut first_test = arms.len();
            for (i, arm) in arms.iter().enumerate() {
                if arm.test_expr.is_none() {
                    fallback = arm.result;
                    first_test = i;
                    break;
                }
            }
            let mut chain = fallback;
            let mut i = first_test;
            while i > 0 {
                i -= 1;
                chain = p.new_expr(
                    E::If {
                        test_: arms[i].test_expr.unwrap(),
                        yes: arms[i].result,
                        no: chain,
                    },
                    args_loc,
                );
            }
            let ret = p.s(S::Return { value: Some(chain) }, switch_body_loc);
            let inner: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[ret]);
            p.s(
                S::Block {
                    stmts: bun_ast::StoreSlice::new_mut(inner),
                    ..Default::default()
                },
                switch_body_loc,
            )
        };

        let body_stmts: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[body_stmt]);
        let arrow = p.new_expr(
            E::Arrow {
                args: bun_ast::StoreSlice::new_mut(args),
                // Body is always a block-style statement (S::Switch or S::Block)
                // so the arrow prints braces and visit consumes the scope.
                prefer_expr: false,
                body: G::FnBody {
                    loc: body_loc,
                    stmts: bun_ast::StoreSlice::new_mut(body_stmts),
                },
                ..Default::default()
            },
            args_loc,
        );

        Ok(p.new_expr(
            E::Call {
                target: arrow,
                args: ExprNodeList::init_one(subject),
                ..Default::default()
            },
            args_loc,
        ))
    }

    /// Parse `is [not] Type` after `_`/bind and return `Type.parse(__pm).tag
    /// === "Ok"` (or `!==` for `not`). Returns `Ok(None)` if no valid Type
    /// followed (caller falls back to wildcard / plain bind).
    fn parse_is_type_test(
        p: &mut Self,
        m_ref: bun_ast::base::Ref,
        m_loc: bun_ast::Loc,
    ) -> PResult<Option<Expr>> {
        p.lexer.next()?; // consume `is`
        let negate = p.lexer.token == T::TIdentifier && p.lexer.raw() == b"not";
        if negate {
            p.lexer.next()?;
        }
        if p.lexer.token != T::TIdentifier
            || !p.lexer.raw().first().is_some_and(|c| c.is_ascii_uppercase())
        {
            return Ok(None);
        }
        let type_name = p.lexer.identifier;
        let type_loc = p.lexer.loc();
        p.lexer.next()?;
        let type_ref = p.store_name_in_ref(type_name)?;
        let type_ident = p.new_expr(E::Identifier::init(type_ref), type_loc);
        let parse_dot = p.new_expr(
            E::Dot {
                target: type_ident,
                name: E::Str::new(b"parse"),
                name_loc: type_loc,
                ..Default::default()
            },
            type_loc,
        );
        let m_ident = p.new_expr(E::Identifier::init(m_ref), m_loc);
        let parse_call = p.new_expr(
            E::Call {
                target: parse_dot,
                args: ExprNodeList::init_one(m_ident),
                ..Default::default()
            },
            type_loc,
        );
        let tag_dot = p.new_expr(
            E::Dot {
                target: parse_call,
                name: E::Str::new(b"tag"),
                name_loc: type_loc,
                ..Default::default()
            },
            type_loc,
        );
        let ok_str = p.new_expr(E::EString::init(b"Ok"), type_loc);
        Ok(Some(p.new_expr(
            E::Binary {
                op: if negate {
                    OpCode::BinStrictNe
                } else {
                    OpCode::BinStrictEq
                },
                left: tag_dot,
                right: ok_str,
            },
            type_loc,
        )))
    }

    /// `__pm.tag === "<ctor>"` for a Result/Option pattern.
    fn build_tag_test_expr(
        p: &mut Self,
        m_ref: bun_ast::base::Ref,
        m_loc: bun_ast::Loc,
        ctor: &[u8],
    ) -> Expr {
        let m_ident = p.new_expr(E::Identifier::init(m_ref), m_loc);
        let tag_dot = p.new_expr(
            E::Dot {
                target: m_ident,
                name: E::Str::new(b"tag"),
                name_loc: m_loc,
                ..Default::default()
            },
            m_loc,
        );
        let tag_str = p.new_expr(E::EString::init(ctor), m_loc);
        p.new_expr(
            E::Binary {
                op: OpCode::BinStrictEq,
                left: tag_dot,
                right: tag_str,
            },
            m_loc,
        )
    }

    /// Parse the optional `(name)` / `(_)` of a ctor pattern. Returns the bound
    /// name on identifier; `None` on `_` or no parens.
    fn parse_ctor_arg_ident(p: &mut Self) -> PResult<Option<&'a [u8]>> {
        if p.lexer.token != T::TOpenParen {
            return Ok(None);
        }
        p.lexer.next()?;
        let mut name: Option<&'a [u8]> = None;
        if p.lexer.token == T::TIdentifier {
            if p.lexer.raw() != b"_" {
                name = Some(p.lexer.identifier);
            }
            p.lexer.next()?;
        }
        p.lexer.expect(T::TCloseParen)?;
        Ok(name)
    }

    /// Parse a literal pattern (with optional `|` OR chain) → the test
    /// `__pm === lit (|| __pm === lit2)*` plus the collected literals (for
    /// switch lowering).
    fn build_arm_test_literals(
        p: &mut Self,
        m_ref: bun_ast::base::Ref,
        m_loc: bun_ast::Loc,
    ) -> PResult<(Expr, &'a [Expr])> {
        let mut lits: std::vec::Vec<Expr> = std::vec::Vec::new();
        let first = p.parse_expr(Level::BitwiseOr)?;
        lits.push(first);
        let m0 = p.new_expr(E::Identifier::init(m_ref), m_loc);
        let mut test = p.new_expr(
            E::Binary {
                op: OpCode::BinStrictEq,
                left: m0,
                right: first,
            },
            m_loc,
        );
        while p.lexer.token == T::TBar {
            p.lexer.next()?;
            let alt = p.parse_expr(Level::BitwiseOr)?;
            lits.push(alt);
            let m_alt = p.new_expr(E::Identifier::init(m_ref), m_loc);
            let eq = p.new_expr(
                E::Binary {
                    op: OpCode::BinStrictEq,
                    left: m_alt,
                    right: alt,
                },
                m_loc,
            );
            test = p.new_expr(
                E::Binary {
                    op: OpCode::BinLogicalOr,
                    left: test,
                    right: eq,
                },
                m_loc,
            );
        }
        Ok((test, p.arena.alloc_slice_copy(&lits)))
    }

    fn is_simple_subject(e: &Expr) -> bool {
        match &e.data {
            ExprData::EIdentifier(_) => true,
            ExprData::EDot(d) => Self::is_simple_subject(&d.target),
            _ => false,
        }
    }

    /// `<subject> === <lit>`, cloning the subject so each test site owns its
    /// nodes (visit mutates Expr in place).
    fn build_subject_eq_lit(p: &mut Self, subject: &Expr, lit: Expr, loc: bun_ast::Loc) -> Expr {
        let left = Self::clone_simple_subject(p, subject);
        p.new_expr(
            E::Binary {
                op: OpCode::BinStrictEq,
                left,
                right: lit,
            },
            loc,
        )
    }

    fn clone_simple_subject(p: &mut Self, e: &Expr) -> Expr {
        match &e.data {
            ExprData::EIdentifier(id) => p.new_expr(E::Identifier::init(id.ref_), e.loc),
            ExprData::EDot(d) => {
                let target = Self::clone_simple_subject(p, &d.target);
                p.new_expr(
                    E::Dot {
                        target,
                        name: d.name,
                        name_loc: d.name_loc,
                        optional_chain: d.optional_chain,
                        ..Default::default()
                    },
                    e.loc,
                )
            }
            _ => p.new_expr(E::Undefined {}, e.loc),
        }
    }

    /// Substitute every identifier named `name` in `e` with `replacement`.
    /// Returns `None` on an unsupported shape (caller keeps the original).
    fn match_substitute_ident(
        p: &mut Self,
        e: Expr,
        name: &[u8],
        replacement: Expr,
    ) -> Option<Expr> {
        let loc = e.loc;
        Some(match e.data {
            ExprData::EIdentifier(id) => {
                if p.load_name_from_ref(id.ref_) == name {
                    replacement
                } else {
                    e
                }
            }
            ExprData::ENumber(_)
            | ExprData::EString(_)
            | ExprData::ENull(_)
            | ExprData::EUndefined(_)
            | ExprData::EMissing(_)
            | ExprData::EBoolean(_)
            | ExprData::EBigInt(_) => e,
            ExprData::EBinary(b) => {
                let left = Self::match_substitute_ident(p, b.left, name, replacement)?;
                let right = Self::match_substitute_ident(p, b.right, name, replacement)?;
                p.new_expr(E::Binary { op: b.op, left, right }, loc)
            }
            ExprData::EUnary(u) => {
                let value = Self::match_substitute_ident(p, u.value, name, replacement)?;
                p.new_expr(E::Unary { op: u.op, value, flags: u.flags }, loc)
            }
            ExprData::EDot(d) => {
                let target = Self::match_substitute_ident(p, d.target, name, replacement)?;
                p.new_expr(
                    E::Dot {
                        target,
                        name: d.name,
                        name_loc: d.name_loc,
                        optional_chain: d.optional_chain,
                        ..Default::default()
                    },
                    loc,
                )
            }
            ExprData::EIndex(ix) => {
                let target = Self::match_substitute_ident(p, ix.target, name, replacement)?;
                let index = Self::match_substitute_ident(p, ix.index, name, replacement)?;
                p.new_expr(
                    E::Index {
                        target,
                        index,
                        optional_chain: ix.optional_chain,
                    },
                    loc,
                )
            }
            ExprData::ECall(c) => {
                let target = Self::match_substitute_ident(p, c.target, name, replacement)?;
                let mut new_args: std::vec::Vec<Expr> = std::vec::Vec::with_capacity(c.args.len());
                for a in c.args.slice() {
                    new_args.push(Self::match_substitute_ident(p, *a, name, replacement)?);
                }
                p.new_expr(
                    E::Call {
                        target,
                        args: ExprNodeList::from_arena_slice(&new_args),
                        close_paren_loc: c.close_paren_loc,
                        optional_chain: c.optional_chain,
                        ..Default::default()
                    },
                    loc,
                )
            }
            ExprData::EIf(f) => {
                let test_ = Self::match_substitute_ident(p, f.test_, name, replacement)?;
                let yes = Self::match_substitute_ident(p, f.yes, name, replacement)?;
                let no = Self::match_substitute_ident(p, f.no, name, replacement)?;
                p.new_expr(E::If { test_, yes, no }, loc)
            }
            _ => return None,
        })
    }

    fn build_match_switch_stmt(
        p: &mut Self,
        m_ref: bun_ast::base::Ref,
        m_loc: bun_ast::Loc,
        body_loc: bun_ast::Loc,
        arms: &[MatchArmMeta<'a>],
    ) -> Stmt {
        let mut cases = bun_alloc::ArenaVec::<js_ast::Case>::new_in(p.arena);
        for arm in arms {
            if arm.is_wildcard {
                let ret = p.s(S::Return { value: Some(arm.result) }, body_loc);
                let body: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[ret]);
                cases.push(js_ast::Case {
                    loc: body_loc,
                    value: None,
                    body: bun_ast::StoreSlice::new_mut(body),
                });
                continue;
            }
            let lits = arm.literals.unwrap();
            let last = lits.len() - 1;
            for (i, lit) in lits.iter().enumerate() {
                if i < last {
                    cases.push(js_ast::Case {
                        loc: body_loc,
                        value: Some(*lit),
                        body: bun_ast::StoreSlice::EMPTY,
                    });
                } else {
                    let ret = p.s(S::Return { value: Some(arm.result) }, body_loc);
                    let body: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[ret]);
                    cases.push(js_ast::Case {
                        loc: body_loc,
                        value: Some(*lit),
                        body: bun_ast::StoreSlice::new_mut(body),
                    });
                }
            }
        }
        let test_ = p.new_expr(E::Identifier::init(m_ref), m_loc);
        p.s(
            S::Switch {
                test_,
                body_loc,
                cases: bun_ast::StoreSlice::from_bump(cases),
            },
            body_loc,
        )
    }

    fn build_match_tag_switch_stmt(
        p: &mut Self,
        m_ref: bun_ast::base::Ref,
        m_loc: bun_ast::Loc,
        body_loc: bun_ast::Loc,
        arms: &[MatchArmMeta<'a>],
    ) -> Stmt {
        let mut cases = bun_alloc::ArenaVec::<js_ast::Case>::new_in(p.arena);
        for arm in arms {
            let ret = p.s(S::Return { value: Some(arm.result) }, body_loc);
            let body: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[ret]);
            let value = if arm.is_wildcard {
                None
            } else {
                Some(p.new_expr(E::EString::init(arm.tag.unwrap()), m_loc))
            };
            cases.push(js_ast::Case {
                loc: body_loc,
                value,
                body: bun_ast::StoreSlice::new_mut(body),
            });
        }
        let m_ident = p.new_expr(E::Identifier::init(m_ref), m_loc);
        let tag_dot = p.new_expr(
            E::Dot {
                target: m_ident,
                name: E::Str::new(b"tag"),
                name_loc: m_loc,
                ..Default::default()
            },
            m_loc,
        );
        p.s(
            S::Switch {
                test_: tag_dot,
                body_loc,
                cases: bun_ast::StoreSlice::from_bump(cases),
            },
            body_loc,
        )
    }

    // Parabun: bare `None` → `{ tag: "None" }`.
    fn parse_none_literal(p: &mut Self, loc: bun_ast::Loc) -> PResult<Expr> {
        let mut properties: bun_alloc::ArenaVec<'_, G::Property> =
            bun_alloc::ArenaVec::new_in(p.arena);
        let tag_key = p.new_expr(E::EString::init(b"tag"), loc);
        let tag_val = p.new_expr(E::EString::init(b"None"), loc);
        properties.push(G::Property {
            key: Some(tag_key),
            value: Some(tag_val),
            ..Default::default()
        });
        Ok(p.new_expr(
            E::Object {
                properties: G::PropertyList::from_bump_vec(properties),
                ..Default::default()
            },
            loc,
        ))
    }

    fn pfx_t_identifier(p: &mut Self, level: Level) -> PResult<Expr> {
        let loc = p.lexer.loc();
        let name = p.lexer.identifier;

        // Fast path: only `async` / `await` / `yield` need `name_range` and the raw
        // (possibly escaped) token text. For every other identifier — the vast
        // majority of identifier-prefix expressions — skip the bounds-checked
        // `raw()` slice and the `range()` construction. Both must be read before
        // `lexer.next()` advances past the token, so compute them here when needed.
        let async_kind = AsyncPrefixExpression::find(name);
        let (name_range, raw) = if async_kind == AsyncPrefixExpression::None {
            (bun_ast::Range::NONE, name)
        } else {
            (p.lexer.range(), p.lexer.raw())
        };

        p.lexer.next()?;

        // Parabun: "pure function ..." parses as a (pure) function expression.
        // Purity *enforcement* (rejecting impure ops / this / free vars) is not
        // yet ported — this makes `pure function f(){}` parse and run. Arrow
        // forms (`pure x =>`, `pure () =>`) are also not yet ported.
        if name == b"pure" && !p.lexer.has_newline_before {
            // `pure function ...`
            if p.lexer.token == T::TFunction {
                let expr = p.parse_fn_expr(loc, false, bun_ast::Range::NONE)?;
                return p.enforce_purity_on_expr(expr);
            }
            // `pure x => ...` — single-param arrow (a bare `pure IDENT` is not
            // valid JS otherwise, so delegating is safe). Also covers
            // `pure async x => …` / `pure async (x) => …`, which the identifier
            // prefix recognises as an async arrow.
            if p.lexer.token == T::TIdentifier {
                let expr = Self::pfx_t_identifier(p, level)?;
                return p.enforce_purity_on_expr(expr);
            }
            // `pure <T>(params): R => ...` — generic arrow. Skip the TS type
            // parameters, then parse the paren-arrow.
            if Self::IS_TYPESCRIPT_ENABLED
                && p.lexer.token == T::TLessThan
                && (!p.is_jsx_enabled() || p.is_ts_arrow_fn_jsx()?)
            {
                match p.try_skip_type_script_type_parameters_then_open_paren_with_backtracking() {
                    SkipTypeParameterResult::DidNotSkipAnything => {}
                    result => {
                        p.lexer.next()?;
                        let expr = p.parse_paren_expr(
                            loc,
                            level,
                            ParenExprOpts {
                                force_arrow_fn: result
                                    == SkipTypeParameterResult::DefinitelyTypeParameters,
                                ..Default::default()
                            },
                        )?;
                        return p.enforce_purity_on_expr(expr);
                    }
                }
            }
            // `pure (params) => ...` — keep only if it's actually an arrow, so a
            // call to a `pure` binding (`pure(x)`) is left for the suffix loop.
            if p.lexer.token == T::TOpenParen {
                let snap = p.lexer.snapshot();
                let result = Self::pfx_t_open_paren(p, level)?;
                if matches!(result.data, ExprData::EArrow(_)) {
                    return p.enforce_purity_on_expr(result);
                }
                p.lexer.restore(&snap);
            }
        }

        // Parabun: `memo (params) => ...` / `memo x => ...` → memoized arrow
        //   __parabunMemo(arrow, arity). `memo(x)` (a call) is left alone.
        if name == b"memo" && !p.lexer.has_newline_before {
            let arrow = if p.lexer.token == T::TIdentifier {
                Some(Self::pfx_t_identifier(p, level)?)
            } else if p.lexer.token == T::TOpenParen {
                let snap = p.lexer.snapshot();
                let r = Self::pfx_t_open_paren(p, level)?;
                if matches!(r.data, ExprData::EArrow(_)) {
                    Some(r)
                } else {
                    p.lexer.restore(&snap);
                    None
                }
            } else {
                None
            };
            if let Some(arrow) = arrow {
                if let ExprData::EArrow(a) = arrow.data {
                    let arity: f64 = if a.has_rest_arg {
                        2.0
                    } else {
                        match a.args.len() {
                            0 => 0.0,
                            1 => 1.0,
                            _ => 2.0,
                        }
                    };
                    let arity_expr = p.new_expr(E::Number { value: arity }, loc);
                    return Ok(p.call_runtime(
                        loc,
                        b"__parabunMemo",
                        ExprNodeList::from_slice(&[arrow, arity_expr]),
                    ));
                }
                return Ok(arrow);
            }
        }

        // Parabun: Result / Option constructor desugaring.
        //   Ok(x) → {tag:"Ok",value:x}; Err(e) → {tag:"Err",error:e};
        //   Some(x) → {tag:"Some",value:x}; None → {tag:"None"}
        // Ok/Err/Some only trigger before `(`, so `import { Ok }` and plain
        // identifier uses are unaffected.
        if p.lexer.token == T::TOpenParen {
            if name == b"Ok" {
                return Self::parse_result_ctor(p, b"Ok", b"value", loc);
            }
            if name == b"Err" {
                return Self::parse_result_ctor(p, b"Err", b"error", loc);
            }
            if name == b"Some" {
                return Self::parse_result_ctor(p, b"Some", b"value", loc);
            }
        }
        if name == b"None" {
            // Bare `None` — desugar unless a continuation would treat it as a
            // plain identifier (`(` / `.` / `[` / `=`).
            match p.lexer.token {
                T::TOpenParen | T::TDot | T::TOpenBracket | T::TEquals => {}
                _ => return Self::parse_none_literal(p, loc),
            }
        }

        // Parabun: `parallel { k: v, … }` / `para { … }` → fan-out promise
        // composition: `Promise.all([v…]).then(([__pb…]) => ({ k: __pb… }))`.
        if (name == b"parallel" || name == b"para")
            && !p.lexer.has_newline_before
            && p.lexer.token == T::TOpenBrace
        {
            return Self::parse_parallel_object_expr(p, loc);
        }

        // Parabun: `schema { ... }` → `__paraFromSchema(() => ({ ... }))` —
        // inline schema literal wrapped in a thunk.
        if name == b"schema" && !p.lexer.has_newline_before && p.lexer.token == T::TOpenBrace {
            return Self::parse_schema_object_expr(p, loc);
        }

        // Parabun: `match SUBJECT { lit => res, ..., else => res }`. Triggers
        // when `match` is followed (no newline) by an expression-starting token;
        // `match(x)`/`match[i]` stay plain identifier uses (excluded below).
        //
        // `+`/`-` are deliberately NOT triggers: they are the only tokens that
        // are both unary and binary, so `match + x` / `match - x` is ambiguous
        // with ordinary identifier use of a variable named `match` (which is
        // legal — `match` is contextual, not reserved). Real code uses `match`
        // as an identifier far more often than it heads a match-expression
        // whose subject is a bare signed literal, and committing to the
        // match-expression path here mis-parses the binary form (the subject
        // greedily swallows `+ x` and then the expected `{` is never found —
        // this broke prettier's bundle, e.g. `match + subpath`). Favoring the
        // identifier reading is consistent with how `match(x)`/`match[i]` are
        // already treated. A subject that must start with `+`/`-` can be
        // written with an explicit unary/grouping the parser can't confuse.
        if name == b"match" && !p.lexer.has_newline_before {
            match p.lexer.token {
                T::TIdentifier
                | T::TNumericLiteral
                | T::TStringLiteral
                | T::TTrue
                | T::TFalse
                | T::TNull
                | T::TExclamation
                | T::TTilde
                | T::TTypeof
                | T::TVoid
                | T::TDelete
                | T::TNew => return Self::parse_match_expr(p, loc),
                _ => {}
            }
        }

        // Handle async and await expressions
        match async_kind {
            AsyncPrefixExpression::IsAsync => {
                if (raw.as_ptr() == name.as_ptr() && raw.len() == name.len())
                    || AsyncPrefixExpression::find(raw) == AsyncPrefixExpression::IsAsync
                {
                    return p.parse_async_prefix_expr(name_range, level);
                }
            }

            AsyncPrefixExpression::IsAwait => match p.fn_or_arrow_data_parse.allow_await {
                AwaitOrYield::ForbidAll => {
                    p.log().add_range_error(
                        Some(p.source),
                        name_range,
                        b"The keyword \"await\" cannot be used here",
                    );
                }
                AwaitOrYield::AllowExpr => {
                    if AsyncPrefixExpression::find(raw) != AsyncPrefixExpression::IsAwait {
                        p.log().add_range_error(
                            Some(p.source),
                            name_range,
                            b"The keyword \"await\" cannot be escaped",
                        );
                    } else {
                        if p.fn_or_arrow_data_parse.is_top_level {
                            p.top_level_await_keyword = name_range;
                        }

                        if p.fn_or_arrow_data_parse.track_arrow_arg_errors {
                            p.fn_or_arrow_data_parse.arrow_arg_errors.invalid_expr_await =
                                name_range;
                        }

                        let value = p.parse_expr(Level::Prefix)?;
                        if p.lexer.token == T::TAsteriskAsterisk {
                            p.lexer.unexpected()?;
                            return Err(bun_core::err!("SyntaxError"));
                        }

                        return Ok(p.new_expr(E::Await { value }, loc));
                    }
                }
                AwaitOrYield::AllowIdent => {
                    p.lexer.prev_token_was_await_keyword = true;
                    p.lexer.await_keyword_loc = name_range.loc;
                    p.lexer.fn_or_arrow_start_loc = p.fn_or_arrow_data_parse.needs_async_loc;
                }
            },

            AsyncPrefixExpression::IsYield => {
                match p.fn_or_arrow_data_parse.allow_yield {
                    AwaitOrYield::ForbidAll => {
                        p.log().add_range_error(
                            Some(p.source),
                            name_range,
                            b"The keyword \"yield\" cannot be used here",
                        );
                    }
                    AwaitOrYield::AllowExpr => {
                        if AsyncPrefixExpression::find(raw) != AsyncPrefixExpression::IsYield {
                            p.log().add_range_error(
                                Some(p.source),
                                name_range,
                                b"The keyword \"yield\" cannot be escaped",
                            );
                        } else {
                            if level.gt(Level::Assign) {
                                p.log().add_range_error(
                                    Some(p.source),
                                    name_range,
                                    b"Cannot use a \"yield\" here without parentheses",
                                );
                            }

                            if p.fn_or_arrow_data_parse.track_arrow_arg_errors {
                                p.fn_or_arrow_data_parse.arrow_arg_errors.invalid_expr_yield =
                                    name_range;
                            }

                            return p.parse_yield_expr(loc);
                        }
                    }
                    // .allow_ident => {

                    // },
                    _ => {
                        // Try to gracefully recover if "yield" is used in the wrong place
                        if !p.lexer.has_newline_before {
                            match p.lexer.token {
                                T::TNull
                                | T::TIdentifier
                                | T::TFalse
                                | T::TTrue
                                | T::TNumericLiteral
                                | T::TBigIntegerLiteral
                                | T::TStringLiteral => {
                                    p.log().add_range_error(
                                        Some(p.source),
                                        name_range,
                                        b"Cannot use \"yield\" outside a generator function",
                                    );
                                }
                                _ => {}
                            }
                        }
                    }
                }
            }
            AsyncPrefixExpression::None => {}
        }

        // Handle the start of an arrow expression
        if p.lexer.token == T::TEqualsGreaterThan && level.lte(Level::Assign) {
            let ref_ = p.store_name_in_ref(name).expect("unreachable");
            // PORT NOTE: reshaped for borrowck — build binding before borrowing arena.
            // `Arg` is non-Copy (owns Vec) → use fill_iter instead of alloc_slice_copy.
            let binding = p.b(B::Identifier { r#ref: ref_ }, loc);
            let args = p.arena.alloc_slice_fill_iter([Arg {
                binding,
                ..Default::default()
            }]);

            let _ = p
                .push_scope_for_parse_pass(scope::Kind::FunctionArgs, loc)
                .expect("unreachable");
            // PORT NOTE: Zig `defer p.popScope()` — reshaped so pop_scope runs before `?` propagates
            let mut fn_or_arrow_data = FnOrArrowDataParse {
                needs_async_loc: loc,
                ..Default::default()
            };
            let arrow_result = p.parse_arrow_body(args, &mut fn_or_arrow_data);
            p.pop_scope();
            return Ok(p.new_expr(arrow_result?, loc));
        }

        let ref_ = p.store_name_in_ref(name).expect("unreachable");

        Ok(Expr::init_identifier(ref_, loc))
    }

    fn pfx_t_template_head(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        let head = p.lexer.to_e_string()?;

        let (parts, _tail_loc) = p.parse_template_parts(false)?;

        // Check if TemplateLiteral is unsupported. We don't care for this product.`
        // if ()

        Ok(p.new_expr(
            E::Template {
                tag: None,
                head: E::TemplateContents::Cooked(head),
                parts,
            },
            loc,
        ))
    }

    #[inline]
    fn pfx_t_numeric_literal(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        let value = p.new_expr(
            E::Number {
                value: p.lexer.number,
            },
            loc,
        );
        // p.checkForLegacyOctalLiteral()
        p.lexer.next()?;
        Ok(value)
    }

    // Parabun: `<number>d` decimal literal → `__paraDec("<number>")`, keeping
    // the exact source digits (a string) so no float precision is lost.
    fn pfx_t_decimal_literal(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        let raw = p.lexer.raw(); // includes the trailing `d`
        let text = &raw[..raw.len() - 1];
        let str_expr = p.new_expr(E::EString::init(text), loc);
        p.lexer.next()?;
        // `__paraDec` imported from bun:wrap (matches the @lyku/para-transpile
        // mirror, and makes the literal runnable on a host that resolves the
        // runtime).
        Ok(p.call_runtime(loc, b"__paraDec", ExprNodeList::init_one(str_expr)))
    }

    #[inline]
    fn pfx_t_big_integer_literal(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        let value = E::Str::new(p.lexer.identifier);
        // markSyntaxFeature bigInt
        p.lexer.next()?;
        Ok(p.new_expr(E::BigInt { value }, loc))
    }

    fn pfx_t_slash(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.scan_reg_exp()?;
        // always set regex_flags_start to null to make sure we don't accidentally use the wrong value later
        // PORT NOTE: Zig `defer p.lexer.regex_flags_start = null` — reset after both success and
        // the `next()?` error path. Reshaped: capture, advance, then unconditionally reset before
        // propagating any error from `next()`.
        let value = E::Str::new(p.lexer.raw());
        let next_result = p.lexer.next();
        let flags_offset = p.lexer.regex_flags_start;
        p.lexer.regex_flags_start = None;
        next_result?;

        Ok(p.new_expr(
            E::RegExp {
                value,
                flags_offset,
            },
            loc,
        ))
    }

    fn pfx_t_void(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        let value = p.parse_expr(Level::Prefix)?;
        if p.lexer.token == T::TAsteriskAsterisk {
            p.lexer.unexpected()?;
            return Err(bun_core::err!("SyntaxError"));
        }

        Ok(p.new_expr(
            E::Unary {
                op: OpCode::UnVoid,
                value,
                flags: UnaryFlags::default(),
            },
            loc,
        ))
    }

    fn pfx_t_typeof(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        let value = p.parse_expr(Level::Prefix)?;
        if p.lexer.token == T::TAsteriskAsterisk {
            p.lexer.unexpected()?;
            return Err(bun_core::err!("SyntaxError"));
        }

        let mut flags = UnaryFlags::default();
        if matches!(value.data, ExprData::EIdentifier(_)) {
            flags |= UnaryFlags::WAS_ORIGINALLY_TYPEOF_IDENTIFIER;
        }
        Ok(p.new_expr(
            E::Unary {
                op: OpCode::UnTypeof,
                value,
                flags,
            },
            loc,
        ))
    }

    fn pfx_t_delete(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        let value = p.parse_expr(Level::Prefix)?;
        if p.lexer.token == T::TAsteriskAsterisk {
            p.lexer.unexpected()?;
            return Err(bun_core::err!("SyntaxError"));
        }
        if let ExprData::EIndex(e_index) = &value.data {
            if let ExprData::EPrivateIdentifier(private) = &e_index.index.data {
                let name = p.load_name_from_ref(private.ref_);
                let range = bun_ast::Range {
                    loc: value.loc,
                    len: i32::try_from(name.len()).expect("int cast"),
                };
                p.log().add_range_error_fmt(
                    Some(p.source),
                    range,
                    format_args!(
                        "Deleting the private name \"{}\" is forbidden",
                        bstr::BStr::new(name),
                    ),
                );
            }
        }

        let mut flags = UnaryFlags::default();
        // Zig: `value.isPropertyAccess()` — `.e_dot, .e_index => true`.
        if matches!(
            value.data,
            ExprData::EIdentifier(_) | ExprData::EDot(_) | ExprData::EIndex(_)
        ) {
            flags |= UnaryFlags::WAS_ORIGINALLY_DELETE_OF_IDENTIFIER_OR_PROPERTY_ACCESS;
        }
        Ok(p.new_expr(
            E::Unary {
                op: OpCode::UnDelete,
                value,
                flags,
            },
            loc,
        ))
    }

    fn pfx_t_plus(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        let value = p.parse_expr(Level::Prefix)?;
        if p.lexer.token == T::TAsteriskAsterisk {
            p.lexer.unexpected()?;
            return Err(bun_core::err!("SyntaxError"));
        }

        Ok(p.new_expr(
            E::Unary {
                op: OpCode::UnPos,
                value,
                flags: UnaryFlags::default(),
            },
            loc,
        ))
    }

    fn pfx_t_minus(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        let value = p.parse_expr(Level::Prefix)?;
        if p.lexer.token == T::TAsteriskAsterisk {
            p.lexer.unexpected()?;
            return Err(bun_core::err!("SyntaxError"));
        }

        Ok(p.new_expr(
            E::Unary {
                op: OpCode::UnNeg,
                value,
                flags: UnaryFlags::default(),
            },
            loc,
        ))
    }

    fn pfx_t_tilde(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        let value = p.parse_expr(Level::Prefix)?;
        if p.lexer.token == T::TAsteriskAsterisk {
            p.lexer.unexpected()?;
            return Err(bun_core::err!("SyntaxError"));
        }

        Ok(p.new_expr(
            E::Unary {
                op: OpCode::UnCpl,
                value,
                flags: UnaryFlags::default(),
            },
            loc,
        ))
    }

    fn pfx_t_exclamation(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        let value = p.parse_expr(Level::Prefix)?;
        if p.lexer.token == T::TAsteriskAsterisk {
            p.lexer.unexpected()?;
            return Err(bun_core::err!("SyntaxError"));
        }

        Ok(p.new_expr(
            E::Unary {
                op: OpCode::UnNot,
                value,
                flags: UnaryFlags::default(),
            },
            loc,
        ))
    }

    fn pfx_t_minus_minus(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        let value = p.parse_expr(Level::Prefix)?;
        Ok(p.new_expr(
            E::Unary {
                op: OpCode::UnPreDec,
                value,
                flags: UnaryFlags::default(),
            },
            loc,
        ))
    }

    fn pfx_t_plus_plus(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        let value = p.parse_expr(Level::Prefix)?;
        Ok(p.new_expr(
            E::Unary {
                op: OpCode::UnPreInc,
                value,
                flags: UnaryFlags::default(),
            },
            loc,
        ))
    }

    #[inline]
    fn pfx_t_function(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.parse_fn_expr(loc, false, bun_ast::Range::NONE)
    }

    fn pfx_t_class(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        let class_keyword = p.lexer.range();
        // markSyntaxFEatuer class
        p.lexer.next()?;
        let mut name: Option<js_ast::LocRef> = None;

        let _ = p
            .push_scope_for_parse_pass(scope::Kind::ClassName, loc)
            .expect("unreachable");

        // Parse an optional class name
        if p.lexer.token == T::TIdentifier {
            let name_text = p.lexer.identifier;
            if !Self::IS_TYPESCRIPT_ENABLED || name_text != b"implements" {
                if p.fn_or_arrow_data_parse.allow_await != AwaitOrYield::AllowIdent
                    && name_text == b"await"
                {
                    p.log().add_range_error(
                        Some(p.source),
                        p.lexer.range(),
                        b"Cannot use \"await\" as an identifier here",
                    );
                }

                name = Some(js_ast::LocRef {
                    loc: p.lexer.loc(),
                    ref_: Some(
                        p.new_symbol(symbol::Kind::Other, name_text)
                            .expect("unreachable"),
                    ),
                });
                p.lexer.next()?;
            }
        }

        // Even anonymous classes can have TypeScript type parameters
        if Self::IS_TYPESCRIPT_ENABLED {
            let _ = p.skip_type_script_type_parameters(
                TypeParameterFlag::ALLOW_IN_OUT_VARIANCE_ANNOTATIONS
                    | TypeParameterFlag::ALLOW_CONST_MODIFIER,
            )?;
        }

        let class = p.parse_class(
            class_keyword,
            name,
            &ParseClassOptions {
                allow_ts_decorators: Self::IS_TYPESCRIPT_ENABLED
                    || p.options.features.standard_decorators,
                ..Default::default()
            },
        )?;
        p.pop_scope();

        Ok(p.new_expr(class, loc))
    }

    fn pfx_t_at(p: &mut Self) -> PResult<Expr> {
        // Parse decorators before a class expression: @dec class { ... }
        let ts_decorators = p.parse_type_script_decorators()?;

        // Expect class keyword after decorators
        if p.lexer.token != T::TClass {
            p.lexer.expected(T::TClass)?;
            return Err(bun_core::err!("SyntaxError"));
        }

        let loc = p.lexer.loc();
        let class_keyword = p.lexer.range();
        p.lexer.next()?;
        let mut name: Option<js_ast::LocRef> = None;

        let _ = p
            .push_scope_for_parse_pass(scope::Kind::ClassName, loc)
            .expect("unreachable");

        // Parse an optional class name
        if p.lexer.token == T::TIdentifier {
            let name_text = p.lexer.identifier;
            if !Self::IS_TYPESCRIPT_ENABLED || name_text != b"implements" {
                if p.fn_or_arrow_data_parse.allow_await != AwaitOrYield::AllowIdent
                    && name_text == b"await"
                {
                    p.log().add_range_error(
                        Some(p.source),
                        p.lexer.range(),
                        b"Cannot use \"await\" as an identifier here",
                    );
                }

                name = Some(js_ast::LocRef {
                    loc: p.lexer.loc(),
                    ref_: Some(
                        p.new_symbol(symbol::Kind::Other, name_text)
                            .expect("unreachable"),
                    ),
                });
                p.lexer.next()?;
            }
        }

        // Even anonymous classes can have TypeScript type parameters
        if Self::IS_TYPESCRIPT_ENABLED {
            let _ = p.skip_type_script_type_parameters(
                TypeParameterFlag::ALLOW_IN_OUT_VARIANCE_ANNOTATIONS
                    | TypeParameterFlag::ALLOW_CONST_MODIFIER,
            )?;
        }

        // PORT NOTE: spec passes the arena-backed `[]ExprNodeIndex` slice directly into
        // `ParseClassOptions{.ts_decorators = ts_decorators}`. `ParseClassOptions::ts_decorators`
        // is currently typed `&'a [Expr]` (parser.rs), so until that field is widened to
        // `ExprNodeList` we copy into the arena (Expr is `Copy`) and let `ts_decorators` drop
        // normally — no `mem::forget` / `from_raw_parts` lifetime laundering (forbidden per
        // PORTING.md §Forbidden patterns; would leak heap when origin is `Owned`).
        let ts_decorators_slice: &'a [Expr] = p.arena.alloc_slice_copy(ts_decorators.slice());

        let class = p.parse_class(
            class_keyword,
            name,
            &ParseClassOptions {
                ts_decorators: ts_decorators_slice,
                allow_ts_decorators: true,
                ..Default::default()
            },
        )?;
        p.pop_scope();

        Ok(p.new_expr(class, loc))
    }

    fn pfx_t_new(p: &mut Self, flags: EFlags) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;

        // Special-case the weird "new.target" expression here
        if p.lexer.token == T::TDot {
            p.lexer.next()?;

            if p.lexer.token != T::TIdentifier || p.lexer.raw() != b"target" {
                p.lexer.unexpected()?;
                return Err(bun_core::err!("SyntaxError"));
            }
            let range = bun_ast::Range {
                loc,
                len: p.lexer.range().end().start - loc.start,
            };

            p.lexer.next()?;
            return Ok(p.new_expr(E::NewTarget { range }, loc));
        }

        // This will become the new expr
        // PORT NOTE: Zig allocates E::New with undefined fields then fills via the arena
        // pointer. Reshaped: parse target into a local, then construct E::New once.
        let mut target = Expr::EMPTY;
        p.parse_expr_with_flags(Level::Member, flags, &mut target)?;

        if Self::IS_TYPESCRIPT_ENABLED {
            // Skip over TypeScript type arguments here if there are any
            if p.lexer.token == T::TLessThan {
                let _ = p.try_skip_type_script_type_arguments_with_backtracking();
            }
        }

        let (args, close_parens_loc) = if p.lexer.token == T::TOpenParen {
            let call_args = p.parse_call_args()?;
            (call_args.list, call_args.loc)
        } else {
            (bun_alloc::AstAlloc::vec(), bun_ast::Loc::EMPTY)
        };

        Ok(p.new_expr(
            E::New {
                target,
                args,
                close_parens_loc,
                ..Default::default()
            },
            loc,
        ))
    }

    fn pfx_t_open_bracket(p: &mut Self, mut errors: Option<&mut DeferredErrors>) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        let mut is_single_line = !p.lexer.has_newline_before;
        let mut items: smallvec::SmallVec<[Expr; 8]> = smallvec::SmallVec::new();
        let mut self_errors = DeferredErrors::default();
        let mut comma_after_spread = bun_ast::Loc::default();

        // Allow "in" inside arrays
        let old_allow_in = p.allow_in;
        p.allow_in = true;

        while p.lexer.token != T::TCloseBracket {
            match p.lexer.token {
                T::TComma => {
                    items.push(Expr {
                        data: ExprData::EMissing(E::Missing {}),
                        loc: p.lexer.loc(),
                    });
                    // PERF(port): was assume_capacity (catch unreachable on append)
                }
                T::TDotDotDot => {
                    if let Some(e) = errors.as_deref_mut() {
                        e.array_spread_feature = Some(p.lexer.range());
                    }

                    let dots_loc = p.lexer.loc();
                    p.lexer.next()?;
                    // PORT NOTE: reshaped for borrowck — Zig wrote into unusedCapacitySlice()[0]
                    // then bumped len; here we parse into a local then push.
                    let mut value = Expr::EMPTY;
                    p.parse_expr_or_bindings(Level::Comma, Some(&mut self_errors), &mut value)?;
                    items.push(p.new_expr(E::Spread { value }, dots_loc));

                    // Commas are not allowed here when destructuring
                    if p.lexer.token == T::TComma {
                        comma_after_spread = p.lexer.loc();
                    }
                }
                _ => {
                    // PORT NOTE: reshaped for borrowck — Zig wrote into unusedCapacitySlice()[0]
                    let mut item = Expr::EMPTY;
                    p.parse_expr_or_bindings(Level::Comma, Some(&mut self_errors), &mut item)?;
                    items.push(item);
                }
            }

            if p.lexer.token != T::TComma {
                break;
            }

            if p.lexer.has_newline_before {
                is_single_line = false;
            }

            p.lexer.next()?;

            if p.lexer.has_newline_before {
                is_single_line = false;
            }
        }

        if p.lexer.has_newline_before {
            is_single_line = false;
        }

        let close_bracket_loc = p.lexer.loc();
        p.lexer.expect(T::TCloseBracket)?;
        p.allow_in = old_allow_in;

        // Is this a binding pattern?
        if p.will_need_binding_pattern() {
            // noop
        } else if errors.is_none() {
            // Is this an expression?
            p.log_expr_errors(&mut self_errors);
        } else {
            // In this case, we can't distinguish between the two yet
            self_errors.merge_into(errors.unwrap());
        }
        let items_list = ExprNodeList::from_arena_slice(&items);
        Ok(p.new_expr(
            E::Array {
                items: items_list,
                comma_after_spread: comma_after_spread.to_nullable(),
                is_single_line,
                close_bracket_loc,
                ..Default::default()
            },
            loc,
        ))
    }

    fn pfx_t_open_brace(p: &mut Self, errors: Option<&mut DeferredErrors>) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        let mut is_single_line = !p.lexer.has_newline_before;
        let mut properties: bun_alloc::ArenaVec<'_, G::Property> =
            bun_alloc::ArenaVec::new_in(p.arena);
        let mut self_errors = DeferredErrors::default();
        let mut comma_after_spread: bun_ast::Loc = bun_ast::Loc::default();

        // Allow "in" inside object literals
        let old_allow_in = p.allow_in;
        p.allow_in = true;

        while p.lexer.token != T::TCloseBrace {
            if p.lexer.token == T::TDotDotDot {
                p.lexer.next()?;
                // PORT NOTE: reshaped for borrowck — Zig wrote into unusedCapacitySlice()[0]
                // with `value: Expr.empty` then parsed into &property.value.?
                let mut value = Expr::EMPTY;
                p.parse_expr_or_bindings(Level::Comma, Some(&mut self_errors), &mut value)?;
                properties.push(G::Property {
                    kind: PropertyKind::Spread,
                    value: Some(value),
                    ..Default::default()
                });

                // Commas are not allowed here when destructuring
                if p.lexer.token == T::TComma {
                    comma_after_spread = p.lexer.loc();
                }
            } else {
                // This property may turn out to be a type in TypeScript, which should be ignored
                let mut property_opts = PropertyOpts::default();
                if let Some(prop) = p.parse_property(
                    PropertyKind::Normal,
                    &mut property_opts,
                    Some(&mut self_errors),
                )? {
                    if cfg!(debug_assertions) {
                        debug_assert!(prop.key.is_some() || prop.value.is_some());
                    }
                    properties.push(prop);
                    // PERF(port): was assume_capacity (catch unreachable on append)
                }
            }

            if p.lexer.token != T::TComma {
                break;
            }

            if p.lexer.has_newline_before {
                is_single_line = false;
            }

            p.lexer.next()?;

            if p.lexer.has_newline_before {
                is_single_line = false;
            }
        }

        if p.lexer.has_newline_before {
            is_single_line = false;
        }

        let close_brace_loc = p.lexer.loc();
        p.lexer.expect(T::TCloseBrace)?;
        p.allow_in = old_allow_in;

        if p.will_need_binding_pattern() {
            // Is this a binding pattern?
        } else if errors.is_none() {
            // Is this an expression?
            p.log_expr_errors(&mut self_errors);
        } else {
            // In this case, we can't distinguish between the two yet
            self_errors.merge_into(errors.unwrap());
        }

        // PORT NOTE: BumpVec → Vec via arena slice; see pfx_t_open_bracket.
        let properties_list = G::PropertyList::from_bump_vec(properties);
        Ok(p.new_expr(
            E::Object {
                properties: properties_list,
                comma_after_spread: if comma_after_spread.start > 0 {
                    Some(comma_after_spread)
                } else {
                    None
                },
                is_single_line,
                close_brace_loc,
                ..Default::default()
            },
            loc,
        ))
    }

    fn pfx_t_less_than(
        p: &mut Self,
        level: Level,
        errors: Option<&mut DeferredErrors>,
        flags: EFlags,
    ) -> PResult<Expr> {
        let loc = p.lexer.loc();
        // This is a very complicated and highly ambiguous area of TypeScript
        // syntax. Many similar-looking things are overloaded.
        //
        // TS:
        //
        //   A type cast:
        //     <A>(x)
        //     <[]>(x)
        //     <A[]>(x)
        //
        //   An arrow function with type parameters:
        //     <A>(x) => {}
        //     <A, B>(x) => {}
        //     <A = B>(x) => {}
        //     <A extends B>(x) => {}
        //
        // TSX:
        //
        //   A JSX element:
        //     <A>(x) => {}</A>
        //     <A extends>(x) => {}</A>
        //     <A extends={false}>(x) => {}</A>
        //
        //   An arrow function with type parameters:
        //     <A, B>(x) => {}
        //     <A extends B>(x) => {}
        //
        //   A syntax error:
        //     <[]>(x)
        //     <A[]>(x)
        //     <A>(x) => {}
        //     <A = B>(x) => {}
        // PERF(port): was comptime monomorphization
        if Self::IS_TYPESCRIPT_ENABLED && p.is_jsx_enabled() {
            if p.is_ts_arrow_fn_jsx()? {
                let _ =
                    p.skip_type_script_type_parameters(TypeParameterFlag::ALLOW_CONST_MODIFIER)?;
                p.lexer.expect(T::TOpenParen)?;
                return p.parse_paren_expr(
                    loc,
                    level,
                    ParenExprOpts {
                        force_arrow_fn: true,
                        ..Default::default()
                    },
                );
            }
        }

        if p.is_jsx_enabled() {
            // Use NextInsideJSXElement() instead of Next() so we parse "<<" as "<"
            p.lexer.next_inside_jsx_element()?;
            let element = p.parse_jsx_element(loc)?;

            // The call to parseJSXElement() above doesn't consume the last
            // TGreaterThan because the caller knows what Next() function to call.
            // Use Next() instead of NextInsideJSXElement() here since the next
            // token is an expression.
            p.lexer.next()?;
            return Ok(element);
        }

        if Self::IS_TYPESCRIPT_ENABLED {
            // This is either an old-style type cast or a generic lambda function

            // "<T>(x)"
            // "<T>(x) => {}"
            match p.try_skip_type_script_type_parameters_then_open_paren_with_backtracking() {
                SkipTypeParameterResult::DidNotSkipAnything => {}
                result => {
                    p.lexer.expect(T::TOpenParen)?;
                    return p.parse_paren_expr(
                        loc,
                        level,
                        ParenExprOpts {
                            force_arrow_fn: result
                                == SkipTypeParameterResult::DefinitelyTypeParameters,
                            ..Default::default()
                        },
                    );
                }
            }

            // "<T>x"
            p.lexer.next()?;
            p.skip_type_script_type(Level::Lowest)?;
            p.lexer.expect_greater_than::<false>()?;
            return p.parse_prefix(level, errors, flags);
        }

        p.lexer.unexpected()?;
        Err(bun_core::err!("SyntaxError"))
    }

    #[inline]
    fn pfx_t_import(p: &mut Self, level: Level) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        p.parse_import_expr(loc, level)
    }

    // Before splitting this up, this used 3 KB of stack space per call.
    /// Parabun: `throw E` as an expression. Desugars to `(() => { throw E; })()`
    /// so `throw` can appear on the RHS of `??`, `||`, `&&`, `?:`, etc.
    /// Ported from `parse_prefix.zig::t_throw_expr`.
    fn pfx_t_throw_expr(p: &mut Self) -> PResult<Expr> {
        let loc = p.lexer.loc();
        p.lexer.next()?;
        if p.lexer.has_newline_before {
            p.log().add_error(
                Some(p.source),
                bun_ast::Loc {
                    start: loc.start + 5,
                },
                b"Unexpected newline after \"throw\"" as &[u8],
            );
            return Err(bun_core::err!("SyntaxError"));
        }

        // The synthesized IIFE needs the same two scopes a real arrow gets in
        // the parse pass. Push them BEFORE parsing the operand so scope
        // locations stay monotonically increasing even if the thrown
        // expression contains nested arrows. function_args at the `throw`
        // keyword; function_body at the operand start (always later — `throw`
        // is 5 chars).
        let body_loc = p.lexer.loc();
        let _ = p.push_scope_for_parse_pass(scope::Kind::FunctionArgs, loc)?;
        let _ = p.push_scope_for_parse_pass(scope::Kind::FunctionBody, body_loc)?;

        // Assign level per the TC39 throw-expression proposal — don't absorb a
        // trailing comma operator.
        let value = p.parse_expr(Level::Assign)?;

        p.pop_scope();
        p.pop_scope();

        let throw_stmt = p.s(S::Throw { value }, loc);
        let stmts: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[throw_stmt]);
        let no_args: &'a mut [Arg] = p.arena.alloc_slice_fill_with(0, |_| Arg::default());
        let arrow = p.new_expr(
            E::Arrow {
                args: bun_ast::StoreSlice::new_mut(no_args),
                is_async: false,
                body: G::FnBody {
                    loc: body_loc,
                    stmts: bun_ast::StoreSlice::new_mut(stmts),
                },
                ..Default::default()
            },
            loc,
        );
        Ok(p.new_expr(
            E::Call {
                target: arrow,
                args: ExprNodeList::from_slice(&[]),
                ..Default::default()
            },
            loc,
        ))
    }

    pub fn parse_prefix(
        &mut self,
        level: Level,
        errors: Option<&mut DeferredErrors>,
        flags: EFlags,
    ) -> PResult<Expr> {
        let p = self;
        match p.lexer.token {
            T::TOpenBracket => Self::pfx_t_open_bracket(p, errors),
            T::TOpenBrace => Self::pfx_t_open_brace(p, errors),
            // Parabun: leading-dot sugar `.member` at expression position.
            T::TDot => Self::pfx_t_dot(p, level),
            T::TLessThan => Self::pfx_t_less_than(p, level, errors, flags),
            T::TImport => Self::pfx_t_import(p, level),
            T::TOpenParen => Self::pfx_t_open_paren(p, level),
            T::TPrivateIdentifier => Self::pfx_t_private_identifier(p, level),
            T::TIdentifier => Self::pfx_t_identifier(p, level),
            T::TFalse => Self::pfx_t_false(p),
            T::TTrue => Self::pfx_t_true(p),
            T::TNull => Self::pfx_t_null(p),
            T::TThis => Self::pfx_t_this(p),
            T::TTemplateHead => Self::pfx_t_template_head(p),
            T::TNumericLiteral => Self::pfx_t_numeric_literal(p),
            T::TDecimalLiteral => Self::pfx_t_decimal_literal(p),
            T::TBigIntegerLiteral => Self::pfx_t_big_integer_literal(p),
            T::TStringLiteral | T::TNoSubstitutionTemplateLiteral => p.parse_string_literal(),
            T::TSlashEquals | T::TSlash => Self::pfx_t_slash(p),
            T::TVoid => Self::pfx_t_void(p),
            T::TTypeof => Self::pfx_t_typeof(p),
            T::TDelete => Self::pfx_t_delete(p),
            T::TPlus => Self::pfx_t_plus(p),
            T::TMinus => Self::pfx_t_minus(p),
            T::TTilde => Self::pfx_t_tilde(p),
            T::TExclamation => Self::pfx_t_exclamation(p),
            T::TMinusMinus => Self::pfx_t_minus_minus(p),
            T::TPlusPlus => Self::pfx_t_plus_plus(p),
            T::TFunction => Self::pfx_t_function(p),
            T::TClass => Self::pfx_t_class(p),
            T::TAt => Self::pfx_t_at(p),
            T::TNew => Self::pfx_t_new(p, flags),
            T::TSuper => Self::pfx_t_super(p, level),
            // Parabun extension: throw in expression position.
            T::TThrow => Self::pfx_t_throw_expr(p),
            _ => {
                // PERF(port): @branchHint(.cold)
                p.lexer.unexpected()?;
                Err(bun_core::err!("SyntaxError"))
            }
        }
    }
}

// ported from: src/js_parser/ast/parsePrefix.zig
