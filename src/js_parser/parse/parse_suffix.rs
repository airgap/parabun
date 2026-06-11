#![allow(clippy::single_match)]
#![warn(unused_must_use)]
use bun_collections::VecExt;
use bun_core::{Error, err};

use crate::lexer::T;
use crate::p::P;
use crate::parser::DeferredErrors;
use crate::scan::scan_side_effects::SideEffects;
use bun_ast::expr::EFlags;
use bun_ast::op::Level;
use bun_ast::{E, Expr, ExprData, ExprNodeList, G, OpCode, OptionalChain, S, Stmt, scope};

// Zig: `fn ParseSuffix(comptime ts, comptime jsx, comptime scan_only) type { return struct { ... } }`
// — file-split mixin pattern. Round-C lowered `const JSX: JSXTransformType` → `J: JsxT`, so this is
// a direct `impl P` block. The 50+ per-token `t_*` helpers are private; only `parse_suffix` is
// surfaced. Round-G un-gates the per-token bodies (same JsxT pattern as parseStmt.rs).

#[derive(Clone, Copy, PartialEq, Eq)]
enum Continuation {
    Next,
    Done,
}

type CResult = core::result::Result<Continuation, Error>;

// ─── Parabun stream-fusion shapes (Zig: parse_suffix.zig 1671-1704) ──────────

#[derive(Clone, Copy)]
enum StreamTerminal {
    Sum,
    Count,
    Min,
    Max,
    ReduceCall { init: Expr, fold: Expr },
    ForEach(Expr),
    Collect,
    // Early-exit terminals — set the accumulator and `break;` on first match.
    Find(Expr),
    FindIndex(Expr),
    Some(Expr),
    Every(Expr),
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum StreamStepKind {
    Map,
    Filter,
    Take,
}

#[derive(Clone, Copy)]
struct StreamStep {
    kind: StreamStepKind,
    // For map/filter, the function/predicate. For take, the count expr.
    fn_or_pred: Expr,
}

#[derive(Clone, Copy)]
enum StreamSource {
    Array(Expr),
    RangeExcl { lo: Expr, hi: Expr },
    RangeIncl { lo: Expr, hi: Expr },
}

// Compile-time pipeline evaluation value (Zig: ConstValue, 1839).
#[derive(Clone, Copy)]
enum ConstValue<'c> {
    Number(f64),
    Boolean(bool),
    Str(&'c [u8]),
    Undef,
    Nul,
}

impl<'a, const TYPESCRIPT: bool, const SCAN_ONLY: bool> P<'a, TYPESCRIPT, SCAN_ONLY> {
    fn sfx_handle_typescript_as(p: &mut Self, level: Level) -> CResult {
        if Self::IS_TYPESCRIPT_ENABLED
            && level.lt(Level::Compare)
            && !p.lexer.has_newline_before
            && (p.lexer.is_contextual_keyword(b"as") || p.lexer.is_contextual_keyword(b"satisfies"))
        {
            p.lexer.next()?;
            p.skip_type_script_type(Level::Lowest)?;

            // These tokens are not allowed to follow a cast expression. This isn't
            // an outright error because it may be on a new line, in which case it's
            // the start of a new expression when it's after a cast:
            //
            //   x = y as z
            //   (something);
            //
            match p.lexer.token {
                T::TPlusPlus
                | T::TMinusMinus
                | T::TNoSubstitutionTemplateLiteral
                | T::TTemplateHead
                | T::TOpenParen
                | T::TOpenBracket
                | T::TQuestionDot => {
                    p.forbid_suffix_after_as_loc = p.lexer.loc();
                    return Ok(Continuation::Done);
                }
                _ => {}
            }

            if p.lexer.token.is_assign() {
                p.forbid_suffix_after_as_loc = p.lexer.loc();
                return Ok(Continuation::Done);
            }
            return Ok(Continuation::Next);
        }
        Ok(Continuation::Done)
    }

    fn sfx_t_dot(
        p: &mut Self,
        optional_chain: &mut Option<OptionalChain>,
        old_optional_chain: Option<OptionalChain>,
        left: &mut Expr,
    ) -> CResult {
        p.lexer.next()?;
        let target = *left;

        if p.lexer.token == T::TPrivateIdentifier && p.allow_private_identifiers {
            // "a.#b"
            // "a?.b.#c"
            if matches!(left.data, ExprData::ESuper(_)) {
                p.lexer.expected(T::TIdentifier)?;
            }

            let name = p.lexer.identifier;
            let name_loc = p.lexer.loc();
            p.lexer.next()?;
            let ref_ = p.store_name_in_ref(name).expect("unreachable");
            let loc = left.loc;
            let index = p.new_expr(E::PrivateIdentifier { ref_ }, name_loc);
            *left = p.new_expr(
                E::Index {
                    target,
                    index,
                    optional_chain: old_optional_chain,
                },
                loc,
            );
        } else {
            // "a.b"
            // "a?.b.c"
            if !p.lexer.is_identifier_or_keyword() {
                p.lexer.expect(T::TIdentifier)?;
            }

            // TODO(port): `E::Dot::name` is `&'static [u8]` (arena-owned slice
            // placeholder); lexer hands back `&'a [u8]`.
            let name = E::Str::new(p.lexer.identifier);
            let name_loc = p.lexer.loc();
            p.lexer.next()?;

            let loc = left.loc;
            *left = p.new_expr(
                E::Dot {
                    target,
                    name,
                    name_loc,
                    optional_chain: old_optional_chain,
                    ..Default::default()
                },
                loc,
            );
        }
        *optional_chain = old_optional_chain;
        Ok(Continuation::Next)
    }

    fn sfx_t_question_dot(
        p: &mut Self,
        level: Level,
        optional_chain: &mut Option<OptionalChain>,
        left: &mut Expr,
    ) -> CResult {
        p.lexer.next()?;
        let mut optional_start: Option<OptionalChain> = Some(OptionalChain::Start);

        // Remove unnecessary optional chains
        if p.options.features.minify_syntax {
            let result = SideEffects::to_null_or_undefined(p, &left.data);
            if result.ok && !result.value {
                optional_start = None;
            }
        }

        match p.lexer.token {
            T::TOpenBracket => {
                // "a?.[b]"
                p.lexer.next()?;

                // allow "in" inside the brackets;
                let old_allow_in = p.allow_in;
                p.allow_in = true;

                let index = p.parse_expr(Level::Lowest)?;

                p.allow_in = old_allow_in;

                p.lexer.expect(T::TCloseBracket)?;
                let loc = left.loc;
                let target = *left;
                *left = p.new_expr(
                    E::Index {
                        target,
                        index,
                        optional_chain: optional_start,
                    },
                    loc,
                );
            }

            T::TOpenParen => {
                // "a?.()"
                if level.gte(Level::Call) {
                    return Ok(Continuation::Done);
                }

                let list_loc = p.parse_call_args()?;
                let loc = left.loc;
                let target = *left;
                *left = p.new_expr(
                    E::Call {
                        target,
                        args: list_loc.list,
                        close_paren_loc: list_loc.loc,
                        optional_chain: optional_start,
                        ..Default::default()
                    },
                    loc,
                );
            }
            T::TLessThan | T::TLessThanLessThan => {
                // "a?.<T>()"
                if !Self::IS_TYPESCRIPT_ENABLED {
                    p.lexer.expected(T::TIdentifier)?;
                    return Err(err!("SyntaxError"));
                }

                let _ = p.skip_type_script_type_arguments::<false>()?;
                if p.lexer.token != T::TOpenParen {
                    p.lexer.expected(T::TOpenParen)?;
                }

                if level.gte(Level::Call) {
                    return Ok(Continuation::Done);
                }

                let list_loc = p.parse_call_args()?;
                let loc = left.loc;
                let target = *left;
                *left = p.new_expr(
                    E::Call {
                        target,
                        args: list_loc.list,
                        close_paren_loc: list_loc.loc,
                        optional_chain: optional_start,
                        ..Default::default()
                    },
                    loc,
                );
            }
            _ => {
                if p.lexer.token == T::TPrivateIdentifier && p.allow_private_identifiers {
                    // "a?.#b"
                    let name = p.lexer.identifier;
                    let name_loc = p.lexer.loc();
                    p.lexer.next()?;
                    let ref_ = p.store_name_in_ref(name).expect("unreachable");
                    let loc = left.loc;
                    let target = *left;
                    let index = p.new_expr(E::PrivateIdentifier { ref_ }, name_loc);
                    *left = p.new_expr(
                        E::Index {
                            target,
                            index,
                            optional_chain: optional_start,
                        },
                        loc,
                    );
                } else {
                    // "a?.b"
                    if !p.lexer.is_identifier_or_keyword() {
                        p.lexer.expect(T::TIdentifier)?;
                    }
                    let name = E::Str::new(p.lexer.identifier);
                    let name_loc = p.lexer.loc();
                    p.lexer.next()?;

                    let loc = left.loc;
                    let target = *left;
                    *left = p.new_expr(
                        E::Dot {
                            target,
                            name,
                            name_loc,
                            optional_chain: optional_start,
                            ..Default::default()
                        },
                        loc,
                    );
                }
            }
        }

        // Only continue if we have started
        if optional_start == Some(OptionalChain::Start) {
            *optional_chain = Some(OptionalChain::Continuation);
        }

        Ok(Continuation::Next)
    }

    fn sfx_t_no_substitution_template_literal(
        p: &mut Self,
        _level: Level,
        _optional_chain: &mut Option<OptionalChain>,
        old_optional_chain: Option<OptionalChain>,
        left: &mut Expr,
    ) -> CResult {
        if old_optional_chain.is_some() {
            p.log().add_range_error(
                Some(p.source),
                p.lexer.range(),
                b"Template literals cannot have an optional chain as a tag",
            );
        }
        // p.markSyntaxFeature(compat.TemplateLiteral, p.lexer.Range());
        let head = E::Str::new(p.lexer.raw_template_contents());
        p.lexer.next()?;

        let loc = left.loc;
        let tag = *left;
        *left = p.new_expr(
            E::Template {
                tag: Some(tag),
                head: E::TemplateContents::Raw(head),
                parts: E::Template::empty_parts(),
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_template_head(
        p: &mut Self,
        _level: Level,
        _optional_chain: &mut Option<OptionalChain>,
        old_optional_chain: Option<OptionalChain>,
        left: &mut Expr,
    ) -> CResult {
        if old_optional_chain.is_some() {
            p.log().add_range_error(
                Some(p.source),
                p.lexer.range(),
                b"Template literals cannot have an optional chain as a tag",
            );
        }
        // p.markSyntaxFeature(compat.TemplateLiteral, p.lexer.Range());
        let head = E::Str::new(p.lexer.raw_template_contents());
        let (parts, _tail_loc) = p.parse_template_parts(true)?;
        let tag = *left;
        let loc = left.loc;
        *left = p.new_expr(
            E::Template {
                tag: Some(tag),
                head: E::TemplateContents::Raw(head),
                parts,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_open_bracket(
        p: &mut Self,
        optional_chain: &mut Option<OptionalChain>,
        old_optional_chain: Option<OptionalChain>,
        left: &mut Expr,
        flags: EFlags,
    ) -> CResult {
        // When parsing a decorator, ignore EIndex expressions since they may be
        // part of a computed property:
        //
        //   class Foo {
        //     @foo ['computed']() {}
        //   }
        //
        // This matches the behavior of the TypeScript compiler.
        if flags == EFlags::TsDecorator {
            return Ok(Continuation::Done);
        }

        p.lexer.next()?;

        // Allow "in" inside the brackets
        let old_allow_in = p.allow_in;
        p.allow_in = true;

        let index = p.parse_expr(Level::Lowest)?;

        p.allow_in = old_allow_in;

        p.lexer.expect(T::TCloseBracket)?;

        let loc = left.loc;
        let target = *left;
        *left = p.new_expr(
            E::Index {
                target,
                index,
                optional_chain: old_optional_chain,
            },
            loc,
        );
        *optional_chain = old_optional_chain;
        Ok(Continuation::Next)
    }

    fn sfx_t_open_paren(
        p: &mut Self,
        level: Level,
        optional_chain: &mut Option<OptionalChain>,
        old_optional_chain: Option<OptionalChain>,
        left: &mut Expr,
    ) -> CResult {
        if level.gte(Level::Call) {
            return Ok(Continuation::Done);
        }

        let list_loc = p.parse_call_args()?;
        let loc = left.loc;
        let target = *left;
        *left = p.new_expr(
            E::Call {
                target,
                args: list_loc.list,
                close_paren_loc: list_loc.loc,
                optional_chain: old_optional_chain,
                ..Default::default()
            },
            loc,
        );
        *optional_chain = old_optional_chain;
        Ok(Continuation::Next)
    }

    fn sfx_t_question(
        p: &mut Self,
        level: Level,
        errors: Option<&mut DeferredErrors>,
        left: &mut Expr,
    ) -> CResult {
        if level.gte(Level::Conditional) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;

        // Stop now if we're parsing one of these:
        // "(a?) => {}"
        // "(a?: b) => {}"
        // "(a?, b?) => {}"
        if Self::IS_TYPESCRIPT_ENABLED
            && left.loc.start == p.latest_arrow_arg_loc.start
            && (p.lexer.token == T::TColon
                || p.lexer.token == T::TCloseParen
                || p.lexer.token == T::TComma)
        {
            let Some(errors) = errors else {
                p.lexer.unexpected()?;
                return Err(err!("SyntaxError"));
            };
            errors.invalid_expr_after_question = Some(p.lexer.range());
            return Ok(Continuation::Done);
        }

        let loc = left.loc;
        let prev = *left;
        // PORT NOTE: Zig allocates an E::If with `undefined` yes/no then writes through the
        // arena pointer (`ternary.data.e_if.yes`). The `Data::EIf(StoreRef<E::If>)` payload is a
        // boxed arena slot, so we mirror that: allocate first, then fill via DerefMut on StoreRef.
        let ternary = p.new_expr(
            E::If {
                test_: prev,
                yes: Expr::EMPTY,
                no: Expr::EMPTY,
            },
            loc,
        );
        let ExprData::EIf(mut e_if) = ternary.data else {
            unreachable!()
        };

        // Allow "in" in between "?" and ":"
        let old_allow_in = p.allow_in;
        p.allow_in = true;

        // condition ? yes : no
        //             ^
        p.parse_expr_with_flags(Level::Comma, EFlags::None, &mut e_if.yes)?;

        p.allow_in = old_allow_in;

        // condition ? yes : no
        //                 ^
        p.lexer.expect(T::TColon)?;

        // condition ? yes : no
        //                   ^
        p.parse_expr_with_flags(Level::Comma, EFlags::None, &mut e_if.no)?;

        // condition ? yes : no
        //                     ^

        *left = ternary;
        Ok(Continuation::Next)
    }

    fn sfx_t_exclamation(
        p: &mut Self,
        optional_chain: &mut Option<OptionalChain>,
        old_optional_chain: Option<OptionalChain>,
    ) -> CResult {
        // Skip over TypeScript non-null assertions
        if p.lexer.has_newline_before {
            return Ok(Continuation::Done);
        }

        if !Self::IS_TYPESCRIPT_ENABLED {
            p.lexer.unexpected()?;
            return Err(err!("SyntaxError"));
        }

        p.lexer.next()?;
        *optional_chain = old_optional_chain;

        Ok(Continuation::Next)
    }

    fn sfx_t_minus_minus(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if p.lexer.has_newline_before || level.gte(Level::Postfix) {
            return Ok(Continuation::Done);
        }

        p.lexer.next()?;
        let loc = left.loc;
        let value = *left;
        *left = p.new_expr(
            E::Unary {
                op: OpCode::UnPostDec,
                value,
                flags: E::UnaryFlags::default(),
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_plus_plus(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if p.lexer.has_newline_before || level.gte(Level::Postfix) {
            return Ok(Continuation::Done);
        }

        p.lexer.next()?;
        let loc = left.loc;
        let value = *left;
        *left = p.new_expr(
            E::Unary {
                op: OpCode::UnPostInc,
                value,
                flags: E::UnaryFlags::default(),
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_comma(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Comma) {
            return Ok(Continuation::Done);
        }

        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Comma)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinComma,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    // Zig used `inline` @field/@tagName comptime dispatch for the 30+ simple binary
    // operators below. Rust has no struct-field-name reflection; each is written out.
    // PORT NOTE: bodies are uniform — `if level.gte(L) {Done}; next; new Binary{op,left,right}`.

    fn sfx_t_plus(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Add) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Add)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinAdd,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_plus_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        // PORT NOTE: Zig wrote `@enumFromInt(@intFromEnum(Op.Level.assign) - 1)`; equivalent to `Level::Assign.sub(1)`.
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinAddAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_minus(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Add) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Add)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinSub,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_minus_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinSubAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_asterisk(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Multiply) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Multiply)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinMul,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_asterisk_asterisk(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Exponentiation) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Exponentiation.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinPow,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_asterisk_asterisk_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinPowAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_asterisk_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinMulAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_percent(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Multiply) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Multiply)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinRem,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_percent_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinRemAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_slash(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Multiply) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Multiply)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinDiv,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_slash_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinDivAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_equals_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Equals) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Equals)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinLooseEq,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_exclamation_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Equals) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Equals)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinLooseNe,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_equals_equals_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Equals) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Equals)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinStrictEq,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_exclamation_equals_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Equals) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Equals)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinStrictNe,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_less_than(
        p: &mut Self,
        level: Level,
        optional_chain: &mut Option<OptionalChain>,
        old_optional_chain: Option<OptionalChain>,
        left: &mut Expr,
    ) -> CResult {
        // TypeScript allows type arguments to be specified with angle brackets
        // inside an expression. Unlike in other languages, this unfortunately
        // appears to require backtracking to parse.
        if Self::IS_TYPESCRIPT_ENABLED && p.try_skip_type_script_type_arguments_with_backtracking()
        {
            *optional_chain = old_optional_chain;
            return Ok(Continuation::Next);
        }

        if level.gte(Level::Compare) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Compare)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinLt,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_less_than_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Compare) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Compare)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinLe,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_greater_than(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Compare) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Compare)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinGt,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_greater_than_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Compare) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Compare)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinGe,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_less_than_less_than(
        p: &mut Self,
        level: Level,
        optional_chain: &mut Option<OptionalChain>,
        old_optional_chain: Option<OptionalChain>,
        left: &mut Expr,
    ) -> CResult {
        // TypeScript allows type arguments to be specified with angle brackets
        // inside an expression. Unlike in other languages, this unfortunately
        // appears to require backtracking to parse.
        if Self::IS_TYPESCRIPT_ENABLED && p.try_skip_type_script_type_arguments_with_backtracking()
        {
            *optional_chain = old_optional_chain;
            return Ok(Continuation::Next);
        }

        if level.gte(Level::Shift) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Shift)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinShl,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_less_than_less_than_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinShlAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_greater_than_greater_than(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Shift) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Shift)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinShr,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_greater_than_greater_than_equals(
        p: &mut Self,
        level: Level,
        left: &mut Expr,
    ) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinShrAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_greater_than_greater_than_greater_than(
        p: &mut Self,
        level: Level,
        left: &mut Expr,
    ) -> CResult {
        if level.gte(Level::Shift) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Shift)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinUShr,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_greater_than_greater_than_greater_than_equals(
        p: &mut Self,
        level: Level,
        left: &mut Expr,
    ) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinUShrAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_question_question(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::NullishCoalescing) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let prev = *left;
        let loc = left.loc;
        let right = p.parse_expr(Level::NullishCoalescing)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinNullishCoalescing,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_question_question_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinNullishCoalescingAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_bar_bar(p: &mut Self, level: Level, left: &mut Expr, flags: EFlags) -> CResult {
        if level.gte(Level::LogicalOr) {
            return Ok(Continuation::Done);
        }

        // Prevent "||" inside "??" from the right
        if level.eql(Level::NullishCoalescing) {
            p.lexer.unexpected()?;
            return Err(err!("SyntaxError"));
        }

        p.lexer.next()?;
        let right = p.parse_expr(Level::LogicalOr)?;
        let loc = left.loc;
        let prev = *left;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinLogicalOr,
                left: prev,
                right,
            },
            loc,
        );

        if level.lt(Level::NullishCoalescing) {
            p.parse_suffix(left, Level::NullishCoalescing.add_f(1), None, flags)?;

            if p.lexer.token == T::TQuestionQuestion {
                p.lexer.unexpected()?;
                return Err(err!("SyntaxError"));
            }
        }
        Ok(Continuation::Next)
    }

    fn sfx_t_bar_bar_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinLogicalOrAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_ampersand_ampersand(
        p: &mut Self,
        level: Level,
        left: &mut Expr,
        flags: EFlags,
    ) -> CResult {
        if level.gte(Level::LogicalAnd) {
            return Ok(Continuation::Done);
        }

        // Prevent "&&" inside "??" from the right
        if level.eql(Level::NullishCoalescing) {
            p.lexer.unexpected()?;
            return Err(err!("SyntaxError"));
        }

        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::LogicalAnd)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinLogicalAnd,
                left: prev,
                right,
            },
            loc,
        );

        // Prevent "&&" inside "??" from the left
        if level.lt(Level::NullishCoalescing) {
            p.parse_suffix(left, Level::NullishCoalescing.add_f(1), None, flags)?;

            if p.lexer.token == T::TQuestionQuestion {
                p.lexer.unexpected()?;
                return Err(err!("SyntaxError"));
            }
        }
        Ok(Continuation::Next)
    }

    fn sfx_t_ampersand_ampersand_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinLogicalAndAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_bar(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::BitwiseOr) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::BitwiseOr)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinBitwiseOr,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    // Parabun: `|>` pipe operator. `expr |> fn` desugars to `fn(expr)`;
    // `expr |> .m()` to `expr.m()` (leading-dot method shorthand). Placeholder
    // (`x |> f(_, 2)`) and stream/inline fusion are not yet ported.
    fn sfx_t_bar_greater_than(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::NullishCoalescing) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;

        // Method shorthand — `x |> .foo` builds `x.foo` directly. Any trailing
        // `(args)` / `.prop` / `[idx]` is handled by the regular suffix loop
        // because the member expression lands back in `left`.
        if p.lexer.token == T::TDot {
            p.lexer.next()?;
            if !p.lexer.is_identifier_or_keyword() {
                p.lexer.expect(T::TIdentifier)?;
            }
            let name = E::Str::new(p.lexer.identifier);
            let name_loc = p.lexer.loc();
            p.lexer.next()?;
            let loc = left.loc;
            let target = *left;
            *left = p.new_expr(
                E::Dot {
                    target,
                    name,
                    name_loc,
                    ..Default::default()
                },
                loc,
            );
            return Ok(Continuation::Next);
        }

        // `expr |> rhs` → `rhs(expr)`.
        let loc = left.loc;
        let rhs = p.parse_expr(Level::NullishCoalescing)?;

        // Placeholder form: when `rhs` is a call whose argument list contains
        // the `_` placeholder, substitute the piped value into each `_` slot
        // instead of wrapping — `x |> f(_, 10)` → `f(x, 10)`.
        if Self::try_pipeline_placeholder(p, left, rhs) {
            return Ok(Continuation::Next);
        }

        // Pipeline inline fusion — inline pure function bodies at the call site.
        if Self::try_inline_pipeline(p, left, rhs) {
            return Ok(Continuation::Next);
        }

        // Stream fusion — collapse `src |> map(f) |> filter(g) |> sum`
        // (and friends) into a single inlined for-loop IIFE so the intermediate
        // arrays / call frames vanish.
        if Self::try_fuse_stream_pipeline(p, left, rhs) {
            return Ok(Continuation::Next);
        }

        // Fallback: rhs(left)
        let piped = *left;
        *left = p.new_expr(
            E::Call {
                target: rhs,
                args: ExprNodeList::init_one(piped),
                close_paren_loc: p.lexer.loc(),
                ..Default::default()
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    // ─── Parabun pipeline inline + stream fusion ───────────────────────────
    // Faithful port of parse_suffix.zig 1309-3042.

    fn is_underscore_placeholder(p: &Self, e: &Expr) -> bool {
        if let ExprData::EIdentifier(id) = e.data {
            p.load_name_from_ref(id.ref_) == b"_"
        } else {
            false
        }
    }

    fn try_pipeline_placeholder(p: &mut Self, left: &mut Expr, rhs: Expr) -> bool {
        let ExprData::ECall(call) = rhs.data else {
            return false;
        };
        let mut placeholder_count = 0usize;
        for arg in call.args.slice() {
            if Self::is_underscore_placeholder(p, arg) {
                placeholder_count += 1;
            }
        }
        if placeholder_count == 0 {
            return false;
        }
        let src_args = call.args.slice();
        let mut new_args: Vec<Expr> = Vec::with_capacity(src_args.len());
        for arg in src_args {
            if Self::is_underscore_placeholder(p, arg) {
                new_args.push(*left);
            } else {
                new_args.push(*arg);
            }
        }
        *left = p.new_expr(
            E::Call {
                target: call.target,
                args: ExprNodeList::from_slice(&new_args),
                close_paren_loc: call.close_paren_loc,
                optional_chain: call.optional_chain,
                ..Default::default()
            },
            rhs.loc,
        );
        true
    }

    /// Try to inline a pure function body at a pipeline call site.
    fn try_inline_pipeline(p: &mut Self, left: &mut Expr, rhs: Expr) -> bool {
        match rhs.data {
            // Case 1: RHS is an inline pure arrow — `pure (x) => expr`.
            ExprData::EArrow(arrow) => {
                if arrow.is_pure
                    && arrow.args.len() == 1
                    && arrow.args.slice()[0].default.is_none()
                    && arrow.body.stmts.len() == 1
                {
                    let arg0 = &arrow.args.slice()[0];
                    if let bun_ast::b::B::BIdentifier(bind) = &arg0.binding.data {
                        if let bun_ast::StmtData::SReturn(ret) = &arrow.body.stmts.slice()[0].data {
                            if let Some(body_expr) = ret.value {
                                let param_name = p.load_name_from_ref(bind.r#ref);
                                if let Some(result) =
                                    Self::substitute_by_name(p, body_expr, param_name, *left)
                                {
                                    *left = result;
                                    return true;
                                }
                            }
                        }
                    }
                }
                false
            }
            // Case 2: RHS is an inline pure function expression.
            ExprData::EFunction(func) => {
                let f = &func.func;
                if f.flags.contains(bun_ast::flags::Function::IsPure)
                    && f.args.len() == 1
                    && f.args.slice()[0].default.is_none()
                    && f.body.stmts.len() == 1
                {
                    let arg0 = &f.args.slice()[0];
                    if let bun_ast::b::B::BIdentifier(bind) = &arg0.binding.data {
                        if let bun_ast::StmtData::SReturn(ret) = &f.body.stmts.slice()[0].data {
                            if let Some(body_expr) = ret.value {
                                let param_name = p.load_name_from_ref(bind.r#ref);
                                if let Some(result) =
                                    Self::substitute_by_name(p, body_expr, param_name, *left)
                                {
                                    *left = result;
                                    return true;
                                }
                            }
                        }
                    }
                }
                false
            }
            // Case 3: RHS is an identifier registered in pure_inline_fns.
            ExprData::EIdentifier(id) => {
                let fn_name = p.load_name_from_ref(id.ref_);
                let found = p
                    .pure_inline_fns
                    .iter()
                    .find(|info| info.fn_name == fn_name)
                    .copied();
                if let Some(info) = found {
                    if let Some(result) =
                        Self::substitute_by_name(p, info.body_expr, info.param_name, *left)
                    {
                        *left = result;
                        p.pure_fusion_consumed_names.insert(info.fn_name);
                        return true;
                    }
                }
                false
            }
            _ => false,
        }
    }

    fn substitute_by_name(
        p: &mut Self,
        expr: Expr,
        param_name: &'a [u8],
        replacement: Expr,
    ) -> Option<Expr> {
        match expr.data {
            ExprData::EIdentifier(id) => {
                if p.load_name_from_ref(id.ref_) == param_name {
                    Some(replacement)
                } else {
                    Some(expr)
                }
            }
            ExprData::ENumber(_)
            | ExprData::EString(_)
            | ExprData::ENull(_)
            | ExprData::EUndefined(_)
            | ExprData::EMissing(_) => Some(expr),
            ExprData::EBinary(bin) => {
                let new_left = Self::substitute_by_name(p, bin.left, param_name, replacement)?;
                let new_right = Self::substitute_by_name(p, bin.right, param_name, replacement)?;
                Some(p.new_expr(
                    E::Binary {
                        op: bin.op,
                        left: new_left,
                        right: new_right,
                    },
                    expr.loc,
                ))
            }
            ExprData::EUnary(un) => {
                let new_val = Self::substitute_by_name(p, un.value, param_name, replacement)?;
                Some(p.new_expr(
                    E::Unary {
                        op: un.op,
                        value: new_val,
                        flags: un.flags,
                    },
                    expr.loc,
                ))
            }
            ExprData::EDot(dot) => {
                let new_target = Self::substitute_by_name(p, dot.target, param_name, replacement)?;
                Some(p.new_expr(
                    E::Dot {
                        target: new_target,
                        name: dot.name,
                        name_loc: dot.name_loc,
                        ..Default::default()
                    },
                    expr.loc,
                ))
            }
            ExprData::EIndex(idx) => {
                let new_target = Self::substitute_by_name(p, idx.target, param_name, replacement)?;
                let new_index = Self::substitute_by_name(p, idx.index, param_name, replacement)?;
                Some(p.new_expr(
                    E::Index {
                        target: new_target,
                        index: new_index,
                        optional_chain: idx.optional_chain,
                    },
                    expr.loc,
                ))
            }
            ExprData::ECall(call) => {
                let new_target = Self::substitute_by_name(p, call.target, param_name, replacement)?;
                let src_args = call.args.slice();
                let mut new_args: Vec<Expr> = Vec::with_capacity(src_args.len());
                for arg in src_args {
                    new_args.push(Self::substitute_by_name(p, *arg, param_name, replacement)?);
                }
                Some(p.new_expr(
                    E::Call {
                        target: new_target,
                        args: ExprNodeList::from_slice(&new_args),
                        close_paren_loc: call.close_paren_loc,
                        ..Default::default()
                    },
                    expr.loc,
                ))
            }
            ExprData::EIf(cond) => {
                let new_test = Self::substitute_by_name(p, cond.test_, param_name, replacement)?;
                let new_yes = Self::substitute_by_name(p, cond.yes, param_name, replacement)?;
                let new_no = Self::substitute_by_name(p, cond.no, param_name, replacement)?;
                Some(p.new_expr(
                    E::If {
                        test_: new_test,
                        yes: new_yes,
                        no: new_no,
                    },
                    expr.loc,
                ))
            }
            _ => None,
        }
    }

    fn classify_stream_source(p: &Self, source: Expr) -> StreamSource {
        if let ExprData::ECall(call) = source.data {
            if let ExprData::EImportIdentifier(imp) = call.target.data {
                if call.args.len() == 2 {
                    let name = p.symbols[imp.ref_.inner_index() as usize]
                        .original_name
                        .slice();
                    let args = call.args.slice();
                    if name.starts_with(b"__parabunRangeInclusive") {
                        return StreamSource::RangeIncl {
                            lo: args[0],
                            hi: args[1],
                        };
                    }
                    if name.starts_with(b"__parabunRange") {
                        return StreamSource::RangeExcl {
                            lo: args[0],
                            hi: args[1],
                        };
                    }
                }
            }
        }
        StreamSource::Array(source)
    }

    fn recognize_stream_terminal(p: &Self, rhs: Expr) -> Option<StreamTerminal> {
        match rhs.data {
            ExprData::EIdentifier(id) => {
                let name = p.load_name_from_ref(id.ref_);
                match name {
                    b"sum" => Some(StreamTerminal::Sum),
                    b"count" => Some(StreamTerminal::Count),
                    b"min" => Some(StreamTerminal::Min),
                    b"max" => Some(StreamTerminal::Max),
                    b"collect" | b"toArray" => Some(StreamTerminal::Collect),
                    _ => None,
                }
            }
            ExprData::ECall(call) => {
                let ExprData::EIdentifier(tid) = call.target.data else {
                    return None;
                };
                let name = p.load_name_from_ref(tid.ref_);
                let args = call.args.slice();
                if name == b"forEach" && args.len() == 1 {
                    return Some(StreamTerminal::ForEach(args[0]));
                }
                if name == b"reduce" && args.len() == 2 {
                    return Some(StreamTerminal::ReduceCall {
                        init: args[0],
                        fold: args[1],
                    });
                }
                if name == b"find" && args.len() == 1 {
                    return Some(StreamTerminal::Find(args[0]));
                }
                if name == b"findIndex" && args.len() == 1 {
                    return Some(StreamTerminal::FindIndex(args[0]));
                }
                if name == b"some" && args.len() == 1 {
                    return Some(StreamTerminal::Some(args[0]));
                }
                if name == b"every" && args.len() == 1 {
                    return Some(StreamTerminal::Every(args[0]));
                }
                None
            }
            _ => None,
        }
    }

    fn recognize_bare_step(p: &Self, rhs: Expr) -> Option<StreamStep> {
        let ExprData::ECall(call) = rhs.data else {
            return None;
        };
        let ExprData::EIdentifier(tid) = call.target.data else {
            return None;
        };
        let args = call.args.slice();
        if args.len() != 1 {
            return None;
        }
        let name = p.load_name_from_ref(tid.ref_);
        let kind = match name {
            b"map" => StreamStepKind::Map,
            b"filter" => StreamStepKind::Filter,
            b"take" => StreamStepKind::Take,
            _ => return None,
        };
        Some(StreamStep {
            kind,
            fn_or_pred: args[0],
        })
    }

    fn recognize_stream_step(p: &Self, expr: Expr) -> Option<(StreamStep, Expr)> {
        let ExprData::ECall(outer) = expr.data else {
            return None;
        };
        let outer_args = outer.args.slice();
        if outer_args.len() != 1 {
            return None;
        }
        let ExprData::ECall(cb_call) = outer.target.data else {
            return None;
        };
        let cb_args = cb_call.args.slice();
        if cb_args.len() != 1 {
            return None;
        }
        let ExprData::EIdentifier(cb_tid) = cb_call.target.data else {
            return None;
        };
        let name = p.load_name_from_ref(cb_tid.ref_);
        let kind = match name {
            b"map" => StreamStepKind::Map,
            b"filter" => StreamStepKind::Filter,
            b"take" => StreamStepKind::Take,
            _ => return None,
        };
        Some((
            StreamStep {
                kind,
                fn_or_pred: cb_args[0],
            },
            outer_args[0],
        ))
    }

    // ─── Compile-time pipeline evaluation ──────────────────────────────────

    fn const_bool_of(v: ConstValue<'_>) -> bool {
        match v {
            ConstValue::Number(n) => n != 0.0 && !n.is_nan(),
            ConstValue::Boolean(b) => b,
            ConstValue::Str(s) => !s.is_empty(),
            ConstValue::Undef | ConstValue::Nul => false,
        }
    }

    fn const_eval_to_expr(p: &mut Self, v: ConstValue<'a>, loc: bun_ast::Loc) -> Expr {
        match v {
            ConstValue::Number(n) => p.new_expr(E::Number { value: n }, loc),
            ConstValue::Boolean(b) => p.new_expr(E::Boolean { value: b }, loc),
            ConstValue::Str(s) => p.new_expr(E::String::init(s), loc),
            ConstValue::Undef => p.new_expr(E::Undefined {}, loc),
            ConstValue::Nul => p.new_expr(E::Null {}, loc),
        }
    }

    fn eval_literal_expr(expr: Expr) -> Option<ConstValue<'a>> {
        match expr.data {
            ExprData::ENumber(n) => Some(ConstValue::Number(n.value)),
            ExprData::EBoolean(b) => Some(ConstValue::Boolean(b.value)),
            ExprData::EString(s) => {
                if s.next.is_none() {
                    Some(ConstValue::Str(s.data.slice()))
                } else {
                    None
                }
            }
            ExprData::EUndefined(_) => Some(ConstValue::Undef),
            ExprData::ENull(_) => Some(ConstValue::Nul),
            ExprData::EUnary(un) => match un.op {
                OpCode::UnNeg => match un.value.data {
                    ExprData::ENumber(n) => Some(ConstValue::Number(-n.value)),
                    _ => None,
                },
                OpCode::UnPos => match un.value.data {
                    ExprData::ENumber(n) => Some(ConstValue::Number(n.value)),
                    _ => None,
                },
                _ => None,
            },
            _ => None,
        }
    }

    fn eval_const(
        p: &mut Self,
        expr: Expr,
        param_name: &'a [u8],
        param_val: ConstValue<'a>,
    ) -> Option<ConstValue<'a>> {
        match expr.data {
            ExprData::ENumber(n) => Some(ConstValue::Number(n.value)),
            ExprData::EBoolean(b) => Some(ConstValue::Boolean(b.value)),
            ExprData::EString(s) => {
                if s.next.is_none() {
                    Some(ConstValue::Str(s.data.slice()))
                } else {
                    None
                }
            }
            ExprData::EUndefined(_) => Some(ConstValue::Undef),
            ExprData::ENull(_) => Some(ConstValue::Nul),
            ExprData::EIdentifier(id) => {
                if p.load_name_from_ref(id.ref_) == param_name {
                    Some(param_val)
                } else {
                    None
                }
            }
            ExprData::EUnary(un) => {
                let v = Self::eval_const(p, un.value, param_name, param_val)?;
                match un.op {
                    OpCode::UnNeg => match v {
                        ConstValue::Number(n) => Some(ConstValue::Number(-n)),
                        _ => None,
                    },
                    OpCode::UnPos => match v {
                        ConstValue::Number(_) => Some(v),
                        _ => None,
                    },
                    OpCode::UnNot => Some(ConstValue::Boolean(!Self::const_bool_of(v))),
                    _ => None,
                }
            }
            ExprData::EBinary(bin) => {
                if bin.op == OpCode::BinLogicalAnd {
                    let l = Self::eval_const(p, bin.left, param_name, param_val)?;
                    if !Self::const_bool_of(l) {
                        return Some(l);
                    }
                    return Self::eval_const(p, bin.right, param_name, param_val);
                }
                if bin.op == OpCode::BinLogicalOr {
                    let l = Self::eval_const(p, bin.left, param_name, param_val)?;
                    if Self::const_bool_of(l) {
                        return Some(l);
                    }
                    return Self::eval_const(p, bin.right, param_name, param_val);
                }
                if bin.op == OpCode::BinNullishCoalescing {
                    let l = Self::eval_const(p, bin.left, param_name, param_val)?;
                    return match l {
                        ConstValue::Undef | ConstValue::Nul => {
                            Self::eval_const(p, bin.right, param_name, param_val)
                        }
                        _ => Some(l),
                    };
                }
                let l = Self::eval_const(p, bin.left, param_name, param_val)?;
                let r = Self::eval_const(p, bin.right, param_name, param_val)?;
                if let (ConstValue::Number(lv), ConstValue::Number(rv)) = (l, r) {
                    return match bin.op {
                        OpCode::BinAdd => Some(ConstValue::Number(lv + rv)),
                        OpCode::BinSub => Some(ConstValue::Number(lv - rv)),
                        OpCode::BinMul => Some(ConstValue::Number(lv * rv)),
                        OpCode::BinDiv => Some(ConstValue::Number(lv / rv)),
                        OpCode::BinRem => Some(ConstValue::Number(lv % rv)),
                        OpCode::BinPow => Some(ConstValue::Number(lv.powf(rv))),
                        OpCode::BinLt => Some(ConstValue::Boolean(lv < rv)),
                        OpCode::BinLe => Some(ConstValue::Boolean(lv <= rv)),
                        OpCode::BinGt => Some(ConstValue::Boolean(lv > rv)),
                        OpCode::BinGe => Some(ConstValue::Boolean(lv >= rv)),
                        OpCode::BinLooseEq | OpCode::BinStrictEq => {
                            Some(ConstValue::Boolean(lv == rv))
                        }
                        OpCode::BinLooseNe | OpCode::BinStrictNe => {
                            Some(ConstValue::Boolean(lv != rv))
                        }
                        OpCode::BinBitwiseAnd => {
                            Some(ConstValue::Number(((lv as i32) & (rv as i32)) as f64))
                        }
                        OpCode::BinBitwiseOr => {
                            Some(ConstValue::Number(((lv as i32) | (rv as i32)) as f64))
                        }
                        OpCode::BinBitwiseXor => {
                            Some(ConstValue::Number(((lv as i32) ^ (rv as i32)) as f64))
                        }
                        _ => None,
                    };
                }
                if let (ConstValue::Str(ls), ConstValue::Str(rs)) = (l, r) {
                    return match bin.op {
                        OpCode::BinLooseEq | OpCode::BinStrictEq => {
                            Some(ConstValue::Boolean(ls == rs))
                        }
                        OpCode::BinLooseNe | OpCode::BinStrictNe => {
                            Some(ConstValue::Boolean(ls != rs))
                        }
                        OpCode::BinAdd => {
                            let mut buf: Vec<u8> = Vec::with_capacity(ls.len() + rs.len());
                            buf.extend_from_slice(ls);
                            buf.extend_from_slice(rs);
                            let slice: &'a [u8] = p.arena.alloc_slice_copy(&buf);
                            Some(ConstValue::Str(slice))
                        }
                        _ => None,
                    };
                }
                None
            }
            ExprData::EIf(cond) => {
                let t = Self::eval_const(p, cond.test_, param_name, param_val)?;
                if Self::const_bool_of(t) {
                    Self::eval_const(p, cond.yes, param_name, param_val)
                } else {
                    Self::eval_const(p, cond.no, param_name, param_val)
                }
            }
            _ => None,
        }
    }

    /// Extract (param_name, body) from a step's fn arg if it qualifies for
    /// inline-style evaluation. Pure named fns in pure_inline_fns qualify too.
    fn extract_evalable(p: &Self, fn_expr: Expr) -> Option<(&'a [u8], Expr)> {
        match fn_expr.data {
            ExprData::EArrow(arrow) => {
                if arrow.args.len() != 1 {
                    return None;
                }
                let arg0 = &arrow.args.slice()[0];
                if arg0.default.is_some() {
                    return None;
                }
                let bun_ast::b::B::BIdentifier(bind) = &arg0.binding.data else {
                    return None;
                };
                if arrow.body.stmts.len() != 1 {
                    return None;
                }
                let bun_ast::StmtData::SReturn(ret) = &arrow.body.stmts.slice()[0].data else {
                    return None;
                };
                let body = ret.value?;
                Some((p.load_name_from_ref(bind.r#ref), body))
            }
            ExprData::EIdentifier(id) => {
                let name = p.load_name_from_ref(id.ref_);
                p.pure_inline_fns
                    .iter()
                    .find(|info| info.fn_name == name)
                    .map(|info| (info.param_name, info.body_expr))
            }
            _ => None,
        }
    }

    fn try_constant_fold_pipeline(
        p: &mut Self,
        source: StreamSource,
        steps: &[StreamStep],
        terminal: StreamTerminal,
        loc: bun_ast::Loc,
    ) -> Option<Expr> {
        const FOLD_LIMIT: usize = 1024;
        let mut elems: Vec<ConstValue<'a>> = Vec::new();

        match source {
            StreamSource::Array(arr_expr) => {
                let ExprData::EArray(arr) = arr_expr.data else {
                    return None;
                };
                let items = arr.items.slice();
                if items.len() > FOLD_LIMIT {
                    return None;
                }
                for item in items {
                    elems.push(Self::eval_literal_expr(*item)?);
                }
            }
            StreamSource::RangeExcl { lo, hi } => {
                let (ExprData::ENumber(lo_n), ExprData::ENumber(hi_n)) = (lo.data, hi.data) else {
                    return None;
                };
                let lo = lo_n.value;
                let hi = hi_n.value;
                if lo != lo.floor() || hi != hi.floor() {
                    return None;
                }
                let start = lo as i64;
                let end = hi as i64;
                if end < start {
                    return None;
                }
                if (end - start) as usize > FOLD_LIMIT {
                    return None;
                }
                let mut ii = start;
                while ii < end {
                    elems.push(ConstValue::Number(ii as f64));
                    ii += 1;
                }
            }
            StreamSource::RangeIncl { lo, hi } => {
                let (ExprData::ENumber(lo_n), ExprData::ENumber(hi_n)) = (lo.data, hi.data) else {
                    return None;
                };
                let lo = lo_n.value;
                let hi = hi_n.value;
                if lo != lo.floor() || hi != hi.floor() {
                    return None;
                }
                let start = lo as i64;
                let end = (hi as i64) + 1;
                if end < start {
                    return None;
                }
                if (end - start) as usize > FOLD_LIMIT {
                    return None;
                }
                let mut ii = start;
                while ii < end {
                    elems.push(ConstValue::Number(ii as f64));
                    ii += 1;
                }
            }
        }

        // Pre-extract step (name, body) — bail on any non-evaluable step.
        struct StepBody<'b> {
            kind: StreamStepKind,
            fn_or_pred: Expr,
            name: &'b [u8],
            body: Option<Expr>,
        }
        let mut step_bodies: Vec<StepBody<'a>> = Vec::with_capacity(steps.len());
        for step in steps {
            if step.kind == StreamStepKind::Take {
                step_bodies.push(StepBody {
                    kind: step.kind,
                    fn_or_pred: step.fn_or_pred,
                    name: b"",
                    body: None,
                });
                continue;
            }
            let (name, body) = Self::extract_evalable(p, step.fn_or_pred)?;
            step_bodies.push(StepBody {
                kind: step.kind,
                fn_or_pred: step.fn_or_pred,
                name,
                body: Some(body),
            });
        }

        let mut acc: ConstValue<'a> = match terminal {
            StreamTerminal::Sum | StreamTerminal::Count => ConstValue::Number(0.0),
            StreamTerminal::Min => ConstValue::Number(f64::INFINITY),
            StreamTerminal::Max => ConstValue::Number(f64::NEG_INFINITY),
            StreamTerminal::Find(_) | StreamTerminal::ForEach(_) => ConstValue::Undef,
            StreamTerminal::FindIndex(_) => ConstValue::Number(-1.0),
            StreamTerminal::Some(_) => ConstValue::Boolean(false),
            StreamTerminal::Every(_) => ConstValue::Boolean(true),
            StreamTerminal::Collect => ConstValue::Number(0.0),
            StreamTerminal::ReduceCall { .. } => return None,
        };

        let mut collect_items: Vec<ConstValue<'a>> = Vec::new();
        let mut take_counts: Vec<i64> = vec![0; 16];

        'element_loop: for (i, &elem) in elems.iter().enumerate() {
            let mut v = elem;
            let mut step_take_idx = 0usize;
            for step_info in &step_bodies {
                match step_info.kind {
                    StreamStepKind::Map => {
                        let new_v = Self::eval_const(p, step_info.body.unwrap(), step_info.name, v)?;
                        v = new_v;
                    }
                    StreamStepKind::Filter => {
                        let test_v =
                            Self::eval_const(p, step_info.body.unwrap(), step_info.name, v)?;
                        if !Self::const_bool_of(test_v) {
                            continue 'element_loop;
                        }
                    }
                    StreamStepKind::Take => {
                        let ExprData::ENumber(n_expr) = step_info.fn_or_pred.data else {
                            return None;
                        };
                        let n_f = n_expr.value;
                        if n_f != n_f.floor() || n_f < 0.0 {
                            return None;
                        }
                        let n = n_f as i64;
                        if take_counts[step_take_idx] >= n {
                            break 'element_loop;
                        }
                        take_counts[step_take_idx] += 1;
                        step_take_idx += 1;
                    }
                }
            }

            match terminal {
                StreamTerminal::Sum => {
                    let (ConstValue::Number(av), ConstValue::Number(vv)) = (acc, v) else {
                        return None;
                    };
                    acc = ConstValue::Number(av + vv);
                }
                StreamTerminal::Count => {
                    let ConstValue::Number(av) = acc else {
                        return None;
                    };
                    acc = ConstValue::Number(av + 1.0);
                }
                StreamTerminal::Min => {
                    let (ConstValue::Number(av), ConstValue::Number(vv)) = (acc, v) else {
                        return None;
                    };
                    if vv < av {
                        acc = v;
                    }
                }
                StreamTerminal::Max => {
                    let (ConstValue::Number(av), ConstValue::Number(vv)) = (acc, v) else {
                        return None;
                    };
                    if vv > av {
                        acc = v;
                    }
                }
                StreamTerminal::Find(pred_expr) => {
                    let (name, body) = Self::extract_evalable(p, pred_expr)?;
                    let t = Self::eval_const(p, body, name, v)?;
                    if Self::const_bool_of(t) {
                        acc = v;
                        break 'element_loop;
                    }
                }
                StreamTerminal::FindIndex(pred_expr) => {
                    let (name, body) = Self::extract_evalable(p, pred_expr)?;
                    let t = Self::eval_const(p, body, name, v)?;
                    if Self::const_bool_of(t) {
                        acc = ConstValue::Number(i as f64);
                        break 'element_loop;
                    }
                }
                StreamTerminal::Some(pred_expr) => {
                    let (name, body) = Self::extract_evalable(p, pred_expr)?;
                    let t = Self::eval_const(p, body, name, v)?;
                    if Self::const_bool_of(t) {
                        acc = ConstValue::Boolean(true);
                        break 'element_loop;
                    }
                }
                StreamTerminal::Every(pred_expr) => {
                    let (name, body) = Self::extract_evalable(p, pred_expr)?;
                    let t = Self::eval_const(p, body, name, v)?;
                    if !Self::const_bool_of(t) {
                        acc = ConstValue::Boolean(false);
                        break 'element_loop;
                    }
                }
                StreamTerminal::Collect => {
                    if collect_items.len() >= FOLD_LIMIT {
                        return None;
                    }
                    collect_items.push(v);
                }
                StreamTerminal::ForEach(_) | StreamTerminal::ReduceCall { .. } => return None,
            }
        }

        if matches!(terminal, StreamTerminal::Collect) {
            let mut arr_items: Vec<Expr> = Vec::with_capacity(collect_items.len());
            let single_line = collect_items.len() <= 4;
            for item in collect_items {
                let e = Self::const_eval_to_expr(p, item, loc);
                arr_items.push(e);
            }
            return Some(p.new_expr(
                E::Array {
                    items: ExprNodeList::from_slice(&arr_items),
                    is_single_line: single_line,
                    ..Default::default()
                },
                loc,
            ));
        }
        Some(Self::const_eval_to_expr(p, acc, loc))
    }

    fn try_fuse_stream_pipeline(p: &mut Self, left: &mut Expr, rhs: Expr) -> bool {
        let mut trailing_step: Option<StreamStep> = None;
        let terminal: StreamTerminal = if let Some(t) = Self::recognize_stream_terminal(p, rhs) {
            t
        } else if p.lexer.token != T::TBarGreaterThan {
            if let Some(step) = Self::recognize_bare_step(p, rhs) {
                trailing_step = Some(step);
                StreamTerminal::Collect
            } else {
                return false;
            }
        } else {
            return false;
        };

        const STEPS_CAP: usize = 16;
        let mut steps: Vec<StreamStep> = Vec::with_capacity(STEPS_CAP);
        if let Some(ts) = trailing_step {
            steps.push(ts);
        }
        let mut current = *left;
        while steps.len() < STEPS_CAP {
            let Some((step, src)) = Self::recognize_stream_step(p, current) else {
                break;
            };
            steps.push(step);
            current = src;
        }

        if steps.len() == STEPS_CAP {
            return false;
        }
        if steps.is_empty() {
            match terminal {
                StreamTerminal::Find(_)
                | StreamTerminal::FindIndex(_)
                | StreamTerminal::Some(_)
                | StreamTerminal::Every(_)
                | StreamTerminal::Min
                | StreamTerminal::Max
                | StreamTerminal::ForEach(_) => {}
                _ => return false,
            }
        }

        let source = Self::classify_stream_source(p, current);
        match source {
            StreamSource::RangeExcl { .. } | StreamSource::RangeIncl { .. } => {}
            StreamSource::Array(_) => match current.data {
                ExprData::EIdentifier(_)
                | ExprData::EDot(_)
                | ExprData::EIndex(_)
                | ExprData::EArray(_) => {}
                _ => return false,
            },
        }

        // We walked outer→source; the application order is the reverse.
        steps.reverse();

        // Compile-time fold first.
        if let Some(folded) =
            Self::try_constant_fold_pipeline(p, source, &steps, terminal, left.loc)
        {
            let chain_lo = left.loc.start;
            let chain_hi = p.lexer.loc().start;
            for entry_opt in p.scopes_in_order.iter_mut() {
                if let Some(entry) = entry_opt {
                    if entry.loc.start >= chain_lo && entry.loc.start < chain_hi {
                        *entry_opt = None;
                    }
                }
            }
            *left = folded;
            return true;
        }

        Self::build_fused_reduce(p, left, source, &steps, terminal)
    }

    /// Try to inline `fn_expr(arg_expr)`. Returns None when not inlinable.
    fn try_inline_fn_call(p: &mut Self, fn_expr: Expr, arg_expr: Expr) -> Option<Expr> {
        match fn_expr.data {
            ExprData::EArrow(arrow) => {
                if arrow.args.len() != 1 {
                    return None;
                }
                let arg0 = &arrow.args.slice()[0];
                if arg0.default.is_some() {
                    return None;
                }
                let bun_ast::b::B::BIdentifier(bind) = &arg0.binding.data else {
                    return None;
                };
                if arrow.body.stmts.len() != 1 {
                    return None;
                }
                let bun_ast::StmtData::SReturn(ret) = &arrow.body.stmts.slice()[0].data else {
                    return None;
                };
                let body = ret.value?;
                let param_name = p.load_name_from_ref(bind.r#ref);
                let out = Self::substitute_by_name(p, body, param_name, arg_expr)?;
                Self::null_arrow_scopes(p, fn_expr.loc, arrow.body.loc);
                Some(out)
            }
            ExprData::EFunction(func) => {
                let f = &func.func;
                if f.args.len() != 1 {
                    return None;
                }
                let arg0 = &f.args.slice()[0];
                if arg0.default.is_some() {
                    return None;
                }
                let bun_ast::b::B::BIdentifier(bind) = &arg0.binding.data else {
                    return None;
                };
                if f.body.stmts.len() != 1 {
                    return None;
                }
                let bun_ast::StmtData::SReturn(ret) = &f.body.stmts.slice()[0].data else {
                    return None;
                };
                let body = ret.value?;
                let param_name = p.load_name_from_ref(bind.r#ref);
                let out = Self::substitute_by_name(p, body, param_name, arg_expr)?;
                Self::null_arrow_scopes(p, fn_expr.loc, f.body.loc);
                Some(out)
            }
            ExprData::EIdentifier(id) => {
                let name = p.load_name_from_ref(id.ref_);
                let found = p
                    .pure_inline_fns
                    .iter()
                    .find(|info| info.fn_name == name)
                    .copied();
                if let Some(info) = found {
                    let inlined =
                        Self::substitute_by_name(p, info.body_expr, info.param_name, arg_expr)?;
                    p.pure_fusion_consumed_names.insert(info.fn_name);
                    return Some(inlined);
                }
                None
            }
            _ => None,
        }
    }

    fn null_arrow_scopes(p: &mut Self, args_loc: bun_ast::Loc, body_loc: bun_ast::Loc) {
        for entry_opt in p.scopes_in_order.iter_mut() {
            if let Some(entry) = entry_opt {
                if entry.loc.start == args_loc.start || entry.loc.start == body_loc.start {
                    *entry_opt = None;
                }
            }
        }
    }

    fn inlined_or_call(
        p: &mut Self,
        fn_expr: Expr,
        val_ref: bun_ast::base::Ref,
        loc: bun_ast::Loc,
    ) -> Expr {
        let arg_expr = p.new_expr(E::Identifier::init(val_ref), loc);
        if let Some(inlined) = Self::try_inline_fn_call(p, fn_expr, arg_expr) {
            return inlined;
        }
        let arg = p.new_expr(E::Identifier::init(val_ref), loc);
        p.new_expr(
            E::Call {
                target: fn_expr,
                args: ExprNodeList::init_one(arg),
                ..Default::default()
            },
            loc,
        )
    }

    fn build_let(
        p: &mut Self,
        r#ref: bun_ast::base::Ref,
        value: Expr,
        loc: bun_ast::Loc,
    ) -> Stmt {
        let binding = p.b(bun_ast::b::Identifier { r#ref }, loc);
        let decl = G::Decl {
            binding,
            value: Some(value),
        };
        p.s(
            S::Local {
                kind: bun_ast::s::Kind::KLet,
                decls: G::DeclList::from_arena_slice(&[decl]),
                ..Default::default()
            },
            loc,
        )
    }

    /// Build an IIFE-wrapped `for` loop and overwrite `*left`. Faithful port of
    /// parse_suffix.zig buildFusedReduce (2461-3042), including scope-tree
    /// surgery (2982-3038).
    fn build_fused_reduce(
        p: &mut Self,
        left: &mut Expr,
        source: StreamSource,
        steps: &[StreamStep],
        terminal: StreamTerminal,
    ) -> bool {
        use bun_ast::base::Ref;
        use bun_ast::symbol::Kind as SymKind;

        let scope_order_len_before = p.scopes_in_order.len();
        let chain_start = left.loc.start;
        let outer_scope = p.current_scope;

        let args_loc = p.lexer.loc();
        let body_loc = bun_ast::Loc {
            start: args_loc.start + 1,
        };
        let for_outer_loc = bun_ast::Loc {
            start: args_loc.start + 2,
        };
        let for_body_loc = bun_ast::Loc {
            start: args_loc.start + 3,
        };

        p.temp_ref_count += 1;
        let counter = p.temp_ref_count;
        let acc_name = bun_alloc::arena_format!(in p.arena, "__pa_{:x}$", counter)
            .into_bump_str()
            .as_bytes();
        let i_name = bun_alloc::arena_format!(in p.arena, "__pi_{:x}$", counter)
            .into_bump_str()
            .as_bytes();
        let val_name = bun_alloc::arena_format!(in p.arena, "__pv_{:x}$", counter)
            .into_bump_str()
            .as_bytes();

        let is_range = !matches!(source, StreamSource::Array(_));

        let mut take_count = 0u32;
        for step in steps {
            if step.kind == StreamStepKind::Take {
                take_count += 1;
            }
        }

        if p
            .push_scope_for_parse_pass(scope::Kind::FunctionArgs, args_loc)
            .is_err()
        {
            return false;
        }
        let src_ref: Ref = if !is_range {
            let src_name = bun_alloc::arena_format!(in p.arena, "__ps_{:x}$", counter)
                .into_bump_str()
                .as_bytes();
            match p.declare_symbol(SymKind::Hoisted, args_loc, src_name) {
                Ok(r) => r,
                Err(_) => return false,
            }
        } else {
            Ref::NONE
        };
        let lo_ref: Ref = if is_range {
            let lo_name = bun_alloc::arena_format!(in p.arena, "__plo_{:x}$", counter)
                .into_bump_str()
                .as_bytes();
            match p.declare_symbol(SymKind::Hoisted, args_loc, lo_name) {
                Ok(r) => r,
                Err(_) => return false,
            }
        } else {
            Ref::NONE
        };
        let hi_ref: Ref = if is_range {
            let hi_name = bun_alloc::arena_format!(in p.arena, "__phi_{:x}$", counter)
                .into_bump_str()
                .as_bytes();
            match p.declare_symbol(SymKind::Hoisted, args_loc, hi_name) {
                Ok(r) => r,
                Err(_) => return false,
            }
        } else {
            Ref::NONE
        };

        if p
            .push_scope_for_parse_pass(scope::Kind::FunctionBody, body_loc)
            .is_err()
        {
            return false;
        }
        let acc_ref = match p.declare_symbol(SymKind::Other, body_loc, acc_name) {
            Ok(r) => r,
            Err(_) => return false,
        };
        let i_ref = match p.declare_symbol(SymKind::Other, body_loc, i_name) {
            Ok(r) => r,
            Err(_) => return false,
        };
        let val_ref = match p.declare_symbol(SymKind::Other, body_loc, val_name) {
            Ok(r) => r,
            Err(_) => return false,
        };

        let mut take_refs: Vec<Ref> = Vec::with_capacity(take_count as usize);
        for k in 0..take_count {
            let tname = bun_alloc::arena_format!(in p.arena, "__pc{}_{:x}$", k, counter)
                .into_bump_str()
                .as_bytes();
            match p.declare_symbol(SymKind::Other, body_loc, tname) {
                Ok(r) => take_refs.push(r),
                Err(_) => return false,
            }
        }

        if p
            .push_scope_for_parse_pass(scope::Kind::Block, for_outer_loc)
            .is_err()
        {
            return false;
        }
        if p
            .push_scope_for_parse_pass(scope::Kind::Block, for_body_loc)
            .is_err()
        {
            return false;
        }
        let for_body_scope = p.current_scope;

        let mut body_stmts: Vec<Stmt> = Vec::with_capacity(5 + take_count as usize);

        // Init value per terminal.
        let acc_init: Expr = match terminal {
            StreamTerminal::Sum | StreamTerminal::Count => {
                p.new_expr(E::Number { value: 0.0 }, body_loc)
            }
            StreamTerminal::ReduceCall { init, .. } => init,
            StreamTerminal::ForEach(_) => p.new_expr(E::Undefined {}, body_loc),
            StreamTerminal::Collect => p.new_expr(
                E::Array {
                    is_single_line: true,
                    ..Default::default()
                },
                body_loc,
            ),
            StreamTerminal::Find(_) => p.new_expr(E::Undefined {}, body_loc),
            StreamTerminal::FindIndex(_) => p.new_expr(E::Number { value: -1.0 }, body_loc),
            StreamTerminal::Some(_) => p.new_expr(E::Boolean { value: false }, body_loc),
            StreamTerminal::Every(_) => p.new_expr(E::Boolean { value: true }, body_loc),
            StreamTerminal::Min => p.new_expr(E::Number { value: f64::INFINITY }, body_loc),
            StreamTerminal::Max => p.new_expr(
                E::Number {
                    value: f64::NEG_INFINITY,
                },
                body_loc,
            ),
        };

        // let __acc = INIT;
        body_stmts.push(Self::build_let(p, acc_ref, acc_init, body_loc));
        // let __i = 0;  (array)  or  let __i = __plo;  (range)
        let i_init_expr: Expr = if is_range {
            p.new_expr(E::Identifier::init(lo_ref), body_loc)
        } else {
            p.new_expr(E::Number { value: 0.0 }, body_loc)
        };
        body_stmts.push(Self::build_let(p, i_ref, i_init_expr, body_loc));
        // let __pcN = 0; for each take step.
        for &take_ref in &take_refs {
            let zero = p.new_expr(E::Number { value: 0.0 }, body_loc);
            body_stmts.push(Self::build_let(p, take_ref, zero, body_loc));
        }
        // let __pv;  (no initializer)
        {
            let binding = p.b(bun_ast::b::Identifier { r#ref: val_ref }, body_loc);
            let decl = G::Decl {
                binding,
                value: None,
            };
            body_stmts.push(p.s(
                S::Local {
                    kind: bun_ast::s::Kind::KLet,
                    decls: G::DeclList::from_arena_slice(&[decl]),
                    ..Default::default()
                },
                body_loc,
            ));
        }

        let mut loop_stmts: Vec<Stmt> = Vec::with_capacity(3 + steps.len() * 2);

        // __pv = __src[__i];  (array)  or  __pv = __i;  (range)
        {
            let rhs_expr: Expr = if is_range {
                p.new_expr(E::Identifier::init(i_ref), body_loc)
            } else {
                let target = p.new_expr(E::Identifier::init(src_ref), body_loc);
                let index = p.new_expr(E::Identifier::init(i_ref), body_loc);
                p.new_expr(
                    E::Index {
                        target,
                        index,
                        optional_chain: None,
                    },
                    body_loc,
                )
            };
            let lhs = p.new_expr(E::Identifier::init(val_ref), body_loc);
            let assign = p.new_expr(
                E::Binary {
                    op: OpCode::BinAssign,
                    left: lhs,
                    right: rhs_expr,
                },
                body_loc,
            );
            loop_stmts.push(p.s(S::SExpr { value: assign, ..Default::default() }, body_loc));
        }

        // Per-step lowering.
        let mut take_idx = 0usize;
        for step in steps {
            match step.kind {
                StreamStepKind::Map => {
                    let arg_expr = p.new_expr(E::Identifier::init(val_ref), body_loc);
                    let call_or_inline: Expr =
                        if let Some(inlined) = Self::try_inline_fn_call(p, step.fn_or_pred, arg_expr)
                        {
                            inlined
                        } else {
                            let ca = p.new_expr(E::Identifier::init(val_ref), body_loc);
                            p.new_expr(
                                E::Call {
                                    target: step.fn_or_pred,
                                    args: ExprNodeList::init_one(ca),
                                    ..Default::default()
                                },
                                body_loc,
                            )
                        };
                    let lhs = p.new_expr(E::Identifier::init(val_ref), body_loc);
                    let assign = p.new_expr(
                        E::Binary {
                            op: OpCode::BinAssign,
                            left: lhs,
                            right: call_or_inline,
                        },
                        body_loc,
                    );
                    loop_stmts.push(p.s(S::SExpr { value: assign, ..Default::default() }, body_loc));
                }
                StreamStepKind::Filter => {
                    let arg_expr = p.new_expr(E::Identifier::init(val_ref), body_loc);
                    let call_or_inline: Expr =
                        if let Some(inlined) = Self::try_inline_fn_call(p, step.fn_or_pred, arg_expr)
                        {
                            inlined
                        } else {
                            let ca = p.new_expr(E::Identifier::init(val_ref), body_loc);
                            p.new_expr(
                                E::Call {
                                    target: step.fn_or_pred,
                                    args: ExprNodeList::init_one(ca),
                                    ..Default::default()
                                },
                                body_loc,
                            )
                        };
                    let not_expr = p.new_expr(
                        E::Unary {
                            op: OpCode::UnNot,
                            value: call_or_inline,
                            flags: Default::default(),
                        },
                        body_loc,
                    );
                    let yes_stmt = p.s(S::Continue { label: None }, body_loc);
                    loop_stmts.push(p.s(
                        S::If {
                            test_: not_expr,
                            yes: yes_stmt,
                            no: None,
                        },
                        body_loc,
                    ));
                }
                StreamStepKind::Take => {
                    let take_ref = take_refs[take_idx];
                    take_idx += 1;
                    let lhs = p.new_expr(E::Identifier::init(take_ref), body_loc);
                    let test_expr = p.new_expr(
                        E::Binary {
                            op: OpCode::BinGe,
                            left: lhs,
                            right: step.fn_or_pred,
                        },
                        body_loc,
                    );
                    let break_stmt = p.s(S::Break { label: None }, body_loc);
                    loop_stmts.push(p.s(
                        S::If {
                            test_: test_expr,
                            yes: break_stmt,
                            no: None,
                        },
                        body_loc,
                    ));
                    let inc_target = p.new_expr(E::Identifier::init(take_ref), body_loc);
                    let inc_expr = p.new_expr(
                        E::Unary {
                            op: OpCode::UnPostInc,
                            value: inc_target,
                            flags: Default::default(),
                        },
                        body_loc,
                    );
                    loop_stmts.push(p.s(S::SExpr { value: inc_expr, ..Default::default() }, body_loc));
                }
            }
        }

        // Terminal step.
        match terminal {
            StreamTerminal::Sum => {
                let l = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let r = p.new_expr(E::Identifier::init(val_ref), body_loc);
                let add = p.new_expr(E::Binary { op: OpCode::BinAdd, left: l, right: r }, body_loc);
                let lhs = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let assign = p.new_expr(
                    E::Binary { op: OpCode::BinAssign, left: lhs, right: add },
                    body_loc,
                );
                loop_stmts.push(p.s(S::SExpr { value: assign, ..Default::default() }, body_loc));
            }
            StreamTerminal::Count => {
                let l = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let one = p.new_expr(E::Number { value: 1.0 }, body_loc);
                let add = p.new_expr(E::Binary { op: OpCode::BinAdd, left: l, right: one }, body_loc);
                let lhs = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let assign = p.new_expr(
                    E::Binary { op: OpCode::BinAssign, left: lhs, right: add },
                    body_loc,
                );
                loop_stmts.push(p.s(S::SExpr { value: assign, ..Default::default() }, body_loc));
            }
            StreamTerminal::ReduceCall { fold, .. } => {
                let a0 = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let a1 = p.new_expr(E::Identifier::init(val_ref), body_loc);
                let fold_call = p.new_expr(
                    E::Call {
                        target: fold,
                        args: ExprNodeList::from_slice(&[a0, a1]),
                        ..Default::default()
                    },
                    body_loc,
                );
                let lhs = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let assign = p.new_expr(
                    E::Binary { op: OpCode::BinAssign, left: lhs, right: fold_call },
                    body_loc,
                );
                loop_stmts.push(p.s(S::SExpr { value: assign, ..Default::default() }, body_loc));
            }
            StreamTerminal::ForEach(fn_expr) => {
                let a0 = p.new_expr(E::Identifier::init(val_ref), body_loc);
                let fe_call = p.new_expr(
                    E::Call {
                        target: fn_expr,
                        args: ExprNodeList::init_one(a0),
                        ..Default::default()
                    },
                    body_loc,
                );
                loop_stmts.push(p.s(S::SExpr { value: fe_call, ..Default::default() }, body_loc));
            }
            StreamTerminal::Collect => {
                let acc_id = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let push_target = p.new_expr(
                    E::Dot {
                        target: acc_id,
                        name: bun_ast::e::Str::new(b"push"),
                        name_loc: body_loc,
                        ..Default::default()
                    },
                    body_loc,
                );
                let a0 = p.new_expr(E::Identifier::init(val_ref), body_loc);
                let push_call = p.new_expr(
                    E::Call {
                        target: push_target,
                        args: ExprNodeList::init_one(a0),
                        ..Default::default()
                    },
                    body_loc,
                );
                loop_stmts.push(p.s(S::SExpr { value: push_call, ..Default::default() }, body_loc));
            }
            StreamTerminal::Find(pred) => {
                let t1 = Self::inlined_or_call(p, pred, val_ref, body_loc);
                let t2 = Self::inlined_or_call(p, pred, val_ref, body_loc);
                let lhs = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let rhs = p.new_expr(E::Identifier::init(val_ref), body_loc);
                let assign = p.new_expr(
                    E::Binary { op: OpCode::BinAssign, left: lhs, right: rhs },
                    body_loc,
                );
                let yes1 = p.s(S::SExpr { value: assign, ..Default::default() }, body_loc);
                loop_stmts.push(p.s(S::If { test_: t1, yes: yes1, no: None }, body_loc));
                let brk = p.s(S::Break { label: None }, body_loc);
                loop_stmts.push(p.s(S::If { test_: t2, yes: brk, no: None }, body_loc));
            }
            StreamTerminal::FindIndex(pred) => {
                let t1 = Self::inlined_or_call(p, pred, val_ref, body_loc);
                let t2 = Self::inlined_or_call(p, pred, val_ref, body_loc);
                let lhs = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let rhs = p.new_expr(E::Identifier::init(i_ref), body_loc);
                let assign = p.new_expr(
                    E::Binary { op: OpCode::BinAssign, left: lhs, right: rhs },
                    body_loc,
                );
                let yes1 = p.s(S::SExpr { value: assign, ..Default::default() }, body_loc);
                loop_stmts.push(p.s(S::If { test_: t1, yes: yes1, no: None }, body_loc));
                let brk = p.s(S::Break { label: None }, body_loc);
                loop_stmts.push(p.s(S::If { test_: t2, yes: brk, no: None }, body_loc));
            }
            StreamTerminal::Some(pred) => {
                let t1 = Self::inlined_or_call(p, pred, val_ref, body_loc);
                let t2 = Self::inlined_or_call(p, pred, val_ref, body_loc);
                let lhs = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let rhs = p.new_expr(E::Boolean { value: true }, body_loc);
                let assign = p.new_expr(
                    E::Binary { op: OpCode::BinAssign, left: lhs, right: rhs },
                    body_loc,
                );
                let yes1 = p.s(S::SExpr { value: assign, ..Default::default() }, body_loc);
                loop_stmts.push(p.s(S::If { test_: t1, yes: yes1, no: None }, body_loc));
                let brk = p.s(S::Break { label: None }, body_loc);
                loop_stmts.push(p.s(S::If { test_: t2, yes: brk, no: None }, body_loc));
            }
            StreamTerminal::Every(pred) => {
                let t1_inner = Self::inlined_or_call(p, pred, val_ref, body_loc);
                let t1 = p.new_expr(
                    E::Unary { op: OpCode::UnNot, value: t1_inner, flags: Default::default() },
                    body_loc,
                );
                let t2_inner = Self::inlined_or_call(p, pred, val_ref, body_loc);
                let t2 = p.new_expr(
                    E::Unary { op: OpCode::UnNot, value: t2_inner, flags: Default::default() },
                    body_loc,
                );
                let lhs = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let rhs = p.new_expr(E::Boolean { value: false }, body_loc);
                let assign = p.new_expr(
                    E::Binary { op: OpCode::BinAssign, left: lhs, right: rhs },
                    body_loc,
                );
                let yes1 = p.s(S::SExpr { value: assign, ..Default::default() }, body_loc);
                loop_stmts.push(p.s(S::If { test_: t1, yes: yes1, no: None }, body_loc));
                let brk = p.s(S::Break { label: None }, body_loc);
                loop_stmts.push(p.s(S::If { test_: t2, yes: brk, no: None }, body_loc));
            }
            StreamTerminal::Min => {
                let vv = p.new_expr(E::Identifier::init(val_ref), body_loc);
                let av = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let cmp = p.new_expr(E::Binary { op: OpCode::BinLt, left: vv, right: av }, body_loc);
                let lhs = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let rhs = p.new_expr(E::Identifier::init(val_ref), body_loc);
                let assign = p.new_expr(
                    E::Binary { op: OpCode::BinAssign, left: lhs, right: rhs },
                    body_loc,
                );
                let yes1 = p.s(S::SExpr { value: assign, ..Default::default() }, body_loc);
                loop_stmts.push(p.s(S::If { test_: cmp, yes: yes1, no: None }, body_loc));
            }
            StreamTerminal::Max => {
                let vv = p.new_expr(E::Identifier::init(val_ref), body_loc);
                let av = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let cmp = p.new_expr(E::Binary { op: OpCode::BinGt, left: vv, right: av }, body_loc);
                let lhs = p.new_expr(E::Identifier::init(acc_ref), body_loc);
                let rhs = p.new_expr(E::Identifier::init(val_ref), body_loc);
                let assign = p.new_expr(
                    E::Binary { op: OpCode::BinAssign, left: lhs, right: rhs },
                    body_loc,
                );
                let yes1 = p.s(S::SExpr { value: assign, ..Default::default() }, body_loc);
                loop_stmts.push(p.s(S::If { test_: cmp, yes: yes1, no: None }, body_loc));
            }
        }

        // Assemble for-loop.
        let for_test: Expr = {
            let left_expr = p.new_expr(E::Identifier::init(i_ref), body_loc);
            match source {
                StreamSource::Array(_) => {
                    let src_id = p.new_expr(E::Identifier::init(src_ref), body_loc);
                    let len = p.new_expr(
                        E::Dot {
                            target: src_id,
                            name: bun_ast::e::Str::new(b"length"),
                            name_loc: body_loc,
                            ..Default::default()
                        },
                        body_loc,
                    );
                    p.new_expr(E::Binary { op: OpCode::BinLt, left: left_expr, right: len }, body_loc)
                }
                StreamSource::RangeExcl { .. } => {
                    let hi = p.new_expr(E::Identifier::init(hi_ref), body_loc);
                    p.new_expr(E::Binary { op: OpCode::BinLt, left: left_expr, right: hi }, body_loc)
                }
                StreamSource::RangeIncl { .. } => {
                    let hi = p.new_expr(E::Identifier::init(hi_ref), body_loc);
                    p.new_expr(E::Binary { op: OpCode::BinLe, left: left_expr, right: hi }, body_loc)
                }
            }
        };
        let for_update_target = p.new_expr(E::Identifier::init(i_ref), body_loc);
        let for_update = p.new_expr(
            E::Unary {
                op: OpCode::UnPostInc,
                value: for_update_target,
                flags: Default::default(),
            },
            body_loc,
        );
        let loop_slice: &'a mut [Stmt] = p.arena.alloc_slice_copy(&loop_stmts);
        let for_body = p.s(
            S::Block {
                stmts: bun_ast::StoreSlice::new_mut(loop_slice),
                ..Default::default()
            },
            for_body_loc,
        );
        body_stmts.push(p.s(
            S::For {
                init: None,
                test_: Some(for_test),
                update: Some(for_update),
                body: for_body,
            },
            for_outer_loc,
        ));

        // return __acc;
        let ret_val = p.new_expr(E::Identifier::init(acc_ref), body_loc);
        body_stmts.push(p.s(S::Return { value: Some(ret_val) }, body_loc));

        p.pop_scope(); // for_body block
        p.pop_scope(); // for_outer block
        p.pop_scope(); // synth_body
        p.pop_scope(); // synth_args

        // Arrow + IIFE.
        let mut arrow_args: Vec<G::Arg> = Vec::with_capacity(2);
        let mut call_args: Vec<Expr> = Vec::with_capacity(2);
        match source {
            StreamSource::Array(src_expr) => {
                let binding = p.b(bun_ast::b::Identifier { r#ref: src_ref }, args_loc);
                arrow_args.push(G::Arg {
                    binding,
                    ..Default::default()
                });
                call_args.push(src_expr);
            }
            StreamSource::RangeExcl { lo, hi } | StreamSource::RangeIncl { lo, hi } => {
                let lo_b = p.b(bun_ast::b::Identifier { r#ref: lo_ref }, args_loc);
                let hi_b = p.b(bun_ast::b::Identifier { r#ref: hi_ref }, args_loc);
                arrow_args.push(G::Arg {
                    binding: lo_b,
                    ..Default::default()
                });
                arrow_args.push(G::Arg {
                    binding: hi_b,
                    ..Default::default()
                });
                call_args.push(lo);
                call_args.push(hi);
            }
        }

        let arrow_args_slice: &'a mut [G::Arg] =
            p.arena.alloc_slice_fill_iter(arrow_args.into_iter());
        let body_slice: &'a mut [Stmt] = p.arena.alloc_slice_copy(&body_stmts);
        let arrow = p.new_expr(
            E::Arrow {
                args: bun_ast::StoreSlice::new_mut(arrow_args_slice),
                body: G::FnBody {
                    loc: body_loc,
                    stmts: bun_ast::StoreSlice::new_mut(body_slice),
                },
                prefer_expr: false,
                is_async: false,
                is_para_fusion_iife: true,
                ..Default::default()
            },
            args_loc,
        );

        let iife_call = p.new_expr(
            E::Call {
                target: arrow,
                args: ExprNodeList::from_slice(&call_args),
                ..Default::default()
            },
            args_loc,
        );

        *left = iife_call;

        // ─── Scope-tree surgery (Zig 2982-3038) ────────────────────────────
        const SYNTH_SCOPE_COUNT: usize = 4;
        {
            let len = p.scopes_in_order.len();
            if len < scope_order_len_before + SYNTH_SCOPE_COUNT {
                return true;
            }
            let synth_args_entry = p.scopes_in_order[len - 4];
            let synth_body_entry = p.scopes_in_order[len - 3];
            let for_outer_entry = p.scopes_in_order[len - 2];
            let for_body_entry = p.scopes_in_order[len - 1];

            let mut insert_at = scope_order_len_before;
            for i in 0..scope_order_len_before {
                if let Some(entry) = p.scopes_in_order[i] {
                    if entry.loc.start >= chain_start {
                        insert_at = i;
                        break;
                    }
                }
            }

            if insert_at < scope_order_len_before {
                // Re-parent chain scopes whose .parent == outer_scope to
                // for_body_scope.
                for k in insert_at..scope_order_len_before {
                    if let Some(entry) = p.scopes_in_order[k] {
                        // SAFETY: arena-backed scope pointer, live for 'a.
                        let scope_ptr = entry.scope;
                        let parent = unsafe { (*scope_ptr).parent };
                        let is_outer = parent
                            .map(|pr| core::ptr::eq(pr.as_ptr(), outer_scope.as_ptr()))
                            .unwrap_or(false);
                        if is_outer {
                            unsafe {
                                (*scope_ptr).parent = Some(for_body_scope);
                            }
                        }
                    }
                }
                // Move synth quad from end → insert_at position.
                let mut j = len;
                while j > insert_at + SYNTH_SCOPE_COUNT {
                    p.scopes_in_order[j - 1] = p.scopes_in_order[j - 1 - SYNTH_SCOPE_COUNT];
                    j -= 1;
                }
                p.scopes_in_order[insert_at] = synth_args_entry;
                p.scopes_in_order[insert_at + 1] = synth_body_entry;
                p.scopes_in_order[insert_at + 2] = for_outer_entry;
                p.scopes_in_order[insert_at + 3] = for_body_entry;
            }
        }

        true
    }

    // Parabun: `a..b` → `__parabunRange(a, b)` (exclusive range).
    fn sfx_t_dot_dot(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Shift) {
            return Ok(Continuation::Done);
        }
        let op_loc = p.lexer.loc();
        p.lexer.next()?;
        let lhs = *left;
        let rhs = p.parse_expr(Level::Shift)?;
        *left = p.call_runtime(op_loc, b"__parabunRange", ExprNodeList::from_slice(&[lhs, rhs]));
        Ok(Continuation::Next)
    }

    // Parabun: `a ..= b` → `__parabunRangeInclusive(a, b)`.
    fn sfx_t_dot_dot_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Shift) {
            return Ok(Continuation::Done);
        }
        let op_loc = p.lexer.loc();
        p.lexer.next()?;
        let lhs = *left;
        let rhs = p.parse_expr(Level::Shift)?;
        *left =
            p.call_runtime(op_loc, b"__parabunRangeInclusive", ExprNodeList::from_slice(&[lhs, rhs]));
        Ok(Continuation::Next)
    }

    // Parabun: chain-op error handling. `e ..! h` → `e.catch(h)`,
    // `e ..& h` → `e.finally(h)`, `e ..> h` → `e.then(h)`. RHS parses at
    // assign level so a bare arrow handler works. Leading-dot sugar
    // (`..! .message`) is not yet ported.
    fn sfx_chain_op(p: &mut Self, level: Level, left: &mut Expr, method: &'static [u8]) -> CResult {
        if level.gte(Level::Conditional) || p.in_chain_op_arrow_rhs {
            return Ok(Continuation::Done);
        }
        let op_loc = p.lexer.loc();
        p.lexer.next()?;
        let loc = left.loc;
        let target = *left;
        // RHS parses at assign level so a bare arrow handler works
        // (`p ..! err => fallback`); the flag makes any nested chain op back
        // off so `A ..> h1 ..! h2` is `A.then(h1).catch(h2)`. A leading `.`
        // (`..! .message`) becomes a synthetic `(__pcv) => __pcv.message`.
        let handler = if p.lexer.token == T::TDot {
            Self::parse_leading_dot_chain_handler(p, op_loc)?
        } else {
            let prev_in_chain = p.in_chain_op_arrow_rhs;
            p.in_chain_op_arrow_rhs = true;
            let h = p.parse_expr(Level::Assign)?;
            p.in_chain_op_arrow_rhs = prev_in_chain;
            h
        };
        let member = p.new_expr(
            E::Dot {
                target,
                name: E::Str::new(method),
                name_loc: loc,
                ..Default::default()
            },
            loc,
        );
        *left = p.new_expr(
            E::Call {
                target: member,
                args: ExprNodeList::init_one(handler),
                close_paren_loc: p.lexer.loc(),
                ..Default::default()
            },
            loc,
        );
        Ok(Continuation::Next)
    }
    // Parabun: wrap a reactive body statement in
    //   require("@lyku/para-signals").effect(() => { <body_value>; })
    // Shared by `~>` (assignment body) and `->` (call body). Uses the synthetic
    // zero-arg block-body arrow scope recipe (nothing is parsed inside the
    // scopes; the body value was built from already-parsed LHS/RHS).
    // Parabun: `LHS is A | B | …` → `(LHS === A || LHS === B || …)`;
    // `LHS is not A | B` → `(LHS !== A && LHS !== B)`; `LHS is Type` (a single
    // bare identifier RHS) → `Type.parse(LHS).tag === "Ok"`. Each `|`-separated
    // alternative parses at bitwise-or level so `|` delimits them; a quoted
    // `'a|b'` is one string token and stays intact.
    fn sfx_is_membership(p: &mut Self, left: &mut Expr) -> Result<(), Error> {
        let loc = left.loc;
        p.lexer.next()?; // consume `is`
        let negate = p.lexer.token == T::TIdentifier
            && !p.lexer.has_newline_before
            && p.lexer.raw() == b"not";
        if negate {
            p.lexer.next()?;
        }
        let subject = *left;
        let first = p.parse_expr(Level::BitwiseOr)?;

        // A single bare identifier RHS is a schema/type membership check.
        if matches!(first.data, ExprData::EIdentifier(_)) && p.lexer.token != T::TBar {
            let parse_dot = p.new_expr(
                E::Dot {
                    target: first,
                    name: E::Str::new(b"parse"),
                    name_loc: loc,
                    ..Default::default()
                },
                loc,
            );
            let parse_call = p.new_expr(
                E::Call {
                    target: parse_dot,
                    args: ExprNodeList::init_one(subject),
                    ..Default::default()
                },
                loc,
            );
            let tag_dot = p.new_expr(
                E::Dot {
                    target: parse_call,
                    name: E::Str::new(b"tag"),
                    name_loc: loc,
                    ..Default::default()
                },
                loc,
            );
            let ok = p.new_expr(E::EString::init(b"Ok"), loc);
            *left = p.new_expr(
                E::Binary {
                    op: if negate {
                        OpCode::BinStrictNe
                    } else {
                        OpCode::BinStrictEq
                    },
                    left: tag_dot,
                    right: ok,
                },
                loc,
            );
            return Ok(());
        }

        let eq_op = if negate {
            OpCode::BinStrictNe
        } else {
            OpCode::BinStrictEq
        };
        let fold_op = if negate {
            OpCode::BinLogicalAnd
        } else {
            OpCode::BinLogicalOr
        };
        let mut result = p.new_expr(
            E::Binary {
                op: eq_op,
                left: subject,
                right: first,
            },
            loc,
        );
        while p.lexer.token == T::TBar {
            p.lexer.next()?;
            let alt = p.parse_expr(Level::BitwiseOr)?;
            let cmp = p.new_expr(
                E::Binary {
                    op: eq_op,
                    left: subject,
                    right: alt,
                },
                loc,
            );
            result = p.new_expr(
                E::Binary {
                    op: fold_op,
                    left: result,
                    right: cmp,
                },
                loc,
            );
        }
        *left = result;
        Ok(())
    }

    // ─── LYK-827: expression-context `_` lambda shorthand ───────────────
    // `arr.filter(_ > 0)` → `arr.filter((__pu) => __pu > 0)`. Applied per
    // call-arg in `parse_call_args` after the arg is parsed: an arg that
    // contains a free `_` (not nested under an arrow / function literal) and
    // isn't itself bare `_` (that's the pipeline-placeholder slot, handled by
    // the `|>` suffix) becomes the body of a synthetic single-arg arrow whose
    // param is `__pu`. Ported from parse_suffix.zig.

    fn is_bare_underscore(p: &Self, e: &Expr) -> bool {
        matches!(&e.data, ExprData::EIdentifier(id) if p.load_name_from_ref(id.ref_) == b"_")
    }

    /// True if `e` reads a `_` identifier somewhere not nested under an arrow /
    /// function literal. Conservative: unsupported shapes return false.
    fn contains_free_underscore(p: &Self, e: &Expr) -> bool {
        match &e.data {
            ExprData::EIdentifier(id) => p.load_name_from_ref(id.ref_) == b"_",
            ExprData::EBinary(b) => {
                Self::contains_free_underscore(p, &b.left)
                    || Self::contains_free_underscore(p, &b.right)
            }
            ExprData::EUnary(u) => Self::contains_free_underscore(p, &u.value),
            ExprData::EDot(d) => Self::contains_free_underscore(p, &d.target),
            ExprData::EIndex(ix) => {
                Self::contains_free_underscore(p, &ix.target)
                    || Self::contains_free_underscore(p, &ix.index)
            }
            ExprData::ECall(c) => {
                Self::contains_free_underscore(p, &c.target)
                    || c.args.iter().any(|a| Self::contains_free_underscore(p, a))
            }
            ExprData::ENew(n) => {
                Self::contains_free_underscore(p, &n.target)
                    || n.args.iter().any(|a| Self::contains_free_underscore(p, a))
            }
            ExprData::EIf(f) => {
                Self::contains_free_underscore(p, &f.test_)
                    || Self::contains_free_underscore(p, &f.yes)
                    || Self::contains_free_underscore(p, &f.no)
            }
            ExprData::ESpread(s) => Self::contains_free_underscore(p, &s.value),
            ExprData::EAwait(a) => Self::contains_free_underscore(p, &a.value),
            ExprData::EYield(y) => y.value.is_some_and(|v| Self::contains_free_underscore(p, &v)),
            // Arrow / function literals introduce a new scope — stop.
            _ => false,
        }
    }

    /// Substitute every free `_` with a reference to `repl`. Mirrors
    /// `contains_free_underscore`'s scope rule. Returns `None` on an
    /// unsupported shape so the caller bails rather than emit a broken AST.
    fn substitute_free_underscore(p: &mut Self, e: Expr, repl: bun_ast::base::Ref) -> Option<Expr> {
        let loc = e.loc;
        Some(match e.data {
            ExprData::EIdentifier(id) => {
                if p.load_name_from_ref(id.ref_) == b"_" {
                    p.new_expr(E::Identifier::init(repl), loc)
                } else {
                    e
                }
            }
            ExprData::EBinary(b) => {
                let left = Self::substitute_free_underscore(p, b.left, repl)?;
                let right = Self::substitute_free_underscore(p, b.right, repl)?;
                p.new_expr(E::Binary { op: b.op, left, right }, loc)
            }
            ExprData::EUnary(u) => {
                let value = Self::substitute_free_underscore(p, u.value, repl)?;
                p.new_expr(E::Unary { op: u.op, value, flags: u.flags }, loc)
            }
            ExprData::EDot(d) => {
                let target = Self::substitute_free_underscore(p, d.target, repl)?;
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
                let target = Self::substitute_free_underscore(p, ix.target, repl)?;
                let index = Self::substitute_free_underscore(p, ix.index, repl)?;
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
                let target = Self::substitute_free_underscore(p, c.target, repl)?;
                let mut new_args: std::vec::Vec<Expr> = std::vec::Vec::with_capacity(c.args.len());
                for a in c.args.slice() {
                    new_args.push(Self::substitute_free_underscore(p, *a, repl)?);
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
            ExprData::ENew(n) => {
                let target = Self::substitute_free_underscore(p, n.target, repl)?;
                let mut new_args: std::vec::Vec<Expr> = std::vec::Vec::with_capacity(n.args.len());
                for a in n.args.slice() {
                    new_args.push(Self::substitute_free_underscore(p, *a, repl)?);
                }
                p.new_expr(
                    E::New {
                        target,
                        args: ExprNodeList::from_arena_slice(&new_args),
                        close_parens_loc: n.close_parens_loc,
                        ..Default::default()
                    },
                    loc,
                )
            }
            ExprData::EIf(f) => {
                let test_ = Self::substitute_free_underscore(p, f.test_, repl)?;
                let yes = Self::substitute_free_underscore(p, f.yes, repl)?;
                let no = Self::substitute_free_underscore(p, f.no, repl)?;
                p.new_expr(E::If { test_, yes, no }, loc)
            }
            ExprData::ESpread(s) => {
                let value = Self::substitute_free_underscore(p, s.value, repl)?;
                p.new_expr(E::Spread { value }, loc)
            }
            ExprData::EAwait(a) => {
                let value = Self::substitute_free_underscore(p, a.value, repl)?;
                p.new_expr(E::Await { value }, loc)
            }
            ExprData::EYield(y) => {
                let value = match y.value {
                    Some(v) => Some(Self::substitute_free_underscore(p, v, repl)?),
                    None => None,
                };
                p.new_expr(E::Yield { value, is_star: y.is_star }, loc)
            }
            // Arrow / function bodies aren't ours; leaves have no `_`.
            ExprData::EArrow(_)
            | ExprData::EFunction(_)
            | ExprData::ENumber(_)
            | ExprData::EString(_)
            | ExprData::EBoolean(_)
            | ExprData::ENull(_)
            | ExprData::EUndefined(_)
            | ExprData::EMissing(_)
            | ExprData::EBigInt(_)
            | ExprData::ERegExp(_)
            | ExprData::EThis(_)
            | ExprData::ESuper(_) => e,
            // Anything else: bail.
            _ => return None,
        })
    }

    /// Loc of the most recent scope recorded in parse order, if any.
    fn last_recorded_scope_loc(p: &Self) -> Option<bun_ast::Loc> {
        let len = p.scopes_in_order.len();
        for i in (0..len).rev() {
            if let Some(loc) = p.scopes_in_order[i].as_ref().map(|s| s.loc) {
                return Some(loc);
            }
        }
        None
    }

    /// True when `_` is already a declared member somewhere in the current
    /// scope chain. Parse-pass view: only declarations seen so far count, so
    /// a function-scoped `var _` declared *after* the use is missed — that's
    /// the conservative direction (we skip the wrap and keep plain-JS
    /// semantics) only when `_` is provably a real variable.
    fn underscore_is_declared(p: &Self) -> bool {
        let name: &[u8] = b"_";
        let mut scope = Some(p.current_scope);
        while let Some(s) = scope {
            if s.members.get(name).is_some() {
                return true;
            }
            scope = s.parent;
        }
        false
    }

    /// Wrap an arg expression containing a free `_` in `(__pu) => <expr>`.
    /// Returns `None` if the wrap can't be built (unsupported shape / scope
    /// conflict), so the caller keeps the original arg.
    fn try_wrap_underscore_lambda(p: &mut Self, body: Expr, arrow_loc_in: bun_ast::Loc) -> Option<Expr> {
        // Guarantee strictly-increasing scope locations. If the caller's loc is
        // ≥ body.loc, step back one byte (matches the leading-dot arg trick).
        let arrow_loc = if arrow_loc_in.start < body.loc.start {
            arrow_loc_in
        } else if body.loc.start > 0 {
            bun_ast::Loc {
                start: body.loc.start - 1,
            }
        } else {
            arrow_loc_in
        };

        // Both pushes below must extend `scopes_in_order` in strictly
        // increasing loc order or the visit pass replays scopes out of sync
        // (debug builds assert on it inside `push_scope_for_parse_pass`
        // rather than returning Err). A nested arrow/function literal inside
        // `body` has already recorded a scope at a later loc than the wrap
        // point, so the synthetic lambda can't be threaded in — keep the
        // original arg. Broke on prettier's minified bundle (`t(e[_])` where
        // `_` is a loop variable).
        if Self::last_recorded_scope_loc(p).is_some_and(|prev| prev.start >= arrow_loc.start) {
            return None;
        }
        if arrow_loc.start >= body.loc.start {
            return None;
        }

        p.push_scope_for_parse_pass(scope::Kind::FunctionArgs, arrow_loc)
            .ok()?;
        if p
            .push_scope_for_parse_pass(scope::Kind::FunctionBody, body.loc)
            .is_err()
        {
            p.pop_scope();
            return None;
        }

        let param_ref = match p.declare_symbol(bun_ast::symbol::Kind::Constant, body.loc, b"__pu") {
            Ok(r) => r,
            Err(_) => {
                p.pop_scope();
                p.pop_scope();
                return None;
            }
        };

        let subst = Self::substitute_free_underscore(p, body, param_ref);

        p.pop_scope();
        p.pop_scope();

        let subst_body = subst?;
        let ret = p.s(S::Return { value: Some(subst_body) }, body.loc);
        let stmts: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[ret]);
        let binding = p.b(bun_ast::b::Identifier { r#ref: param_ref }, body.loc);
        let arg = G::Arg {
            binding,
            ..Default::default()
        };
        let args: &'a mut [G::Arg] = core::slice::from_mut(p.arena.alloc(arg));
        Some(p.new_expr(
            E::Arrow {
                args: bun_ast::StoreSlice::new_mut(args),
                prefer_expr: true,
                is_async: false,
                body: G::FnBody {
                    loc: body.loc,
                    stmts: bun_ast::StoreSlice::new_mut(stmts),
                },
                ..Default::default()
            },
            arrow_loc,
        ))
    }

    /// Wrap `arg` in a `_`-lambda when it contains a free `_` and isn't itself
    /// bare `_`. Returns the original arg when there's nothing to do.
    pub(crate) fn maybe_wrap_underscore_lambda(p: &mut Self, arg: Expr, arrow_loc: bun_ast::Loc) -> Expr {
        if !p.lexer.is_para {
            return arg;
        }
        if Self::is_bare_underscore(p, &arg) {
            return arg;
        }
        if !Self::contains_free_underscore(p, &arg) {
            return arg;
        }
        // A `_` that resolves to a real declaration is a plain variable, not
        // the lambda placeholder — rewriting would change the program's
        // semantics. Minified bundles hit this constantly (prettier uses `_`
        // as a loop counter: `t(e[_])`).
        if Self::underscore_is_declared(p) {
            return arg;
        }
        Self::try_wrap_underscore_lambda(p, arg, arrow_loc).unwrap_or(arg)
    }

    fn build_reactive_effect_from_stmt(
        p: &mut Self,
        op_loc: bun_ast::Loc,
        body_loc: bun_ast::Loc,
        stmt: Stmt,
        outer_loc: bun_ast::Loc,
    ) -> Result<Expr, Error> {
        let stmts: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[stmt]);

        // The FunctionArgs@op_loc / FunctionBody@body_loc scopes are pushed and
        // popped by the CALLER *around* the RHS parse, so they precede any scope
        // the RHS itself pushed (e.g. an arrow RHS in `x -> (t => f)`).
        // arrow.loc / FnBody.loc must match those locs for the visit pass.
        let no_args: &'a mut [G::Arg] = p.arena.alloc_slice_fill_with(0, |_| G::Arg::default());
        let arrow = p.new_expr(
            E::Arrow {
                args: bun_ast::StoreSlice::new_mut(no_args),
                prefer_expr: false,
                body: G::FnBody {
                    loc: body_loc,
                    stmts: bun_ast::StoreSlice::new_mut(stmts),
                },
                ..Default::default()
            },
            op_loc,
        );

        let require_ref = p.store_name_in_ref(b"require")?;
        let require_ident = p.new_expr(E::Identifier::init(require_ref), op_loc);
        let pkg = p.new_expr(E::EString::init(b"@lyku/para-signals"), op_loc);
        let require_call = p.new_expr(
            E::Call {
                target: require_ident,
                args: ExprNodeList::init_one(pkg),
                ..Default::default()
            },
            op_loc,
        );
        let effect_dot = p.new_expr(
            E::Dot {
                target: require_call,
                name: E::Str::new(b"effect"),
                name_loc: op_loc,
                ..Default::default()
            },
            op_loc,
        );
        Ok(p.new_expr(
            E::Call {
                target: effect_dot,
                args: ExprNodeList::init_one(arrow),
                close_paren_loc: p.lexer.loc(),
                ..Default::default()
            },
            outer_loc,
        ))
    }

    // Parabun: `A ~> B` (B assignable) → effect(() => { B = A; }).
    fn sfx_t_tilde_greater_than(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        let loc = left.loc;
        let op_loc = p.lexer.loc();
        p.lexer.next()?;
        // body_loc inside the operator (op_loc+1) — strictly between op_loc and
        // the RHS. Bracket the RHS parse with the wrapper-arrow scopes so they
        // precede any scope the RHS pushes (matches the visit pass — see comment
        // in build_reactive_effect).
        let body_loc = bun_ast::Loc { start: op_loc.start + 1 };
        p.push_scope_for_parse_pass(scope::Kind::FunctionArgs, op_loc)?;
        p.push_scope_for_parse_pass(scope::Kind::FunctionBody, body_loc)?;
        let rhs = p.parse_expr(Level::Assign)?;
        // The RHS must be an assignable target (identifier / member / index).
        if !matches!(
            rhs.data,
            ExprData::EIdentifier(_) | ExprData::EDot(_) | ExprData::EIndex(_)
        ) {
            p.pop_scope();
            p.pop_scope();
            p.log().add_error(
                Some(p.source),
                op_loc,
                b"`~>` requires an assignable target on the right" as &[u8],
            );
            return Err(err!("SyntaxError"));
        }
        let lhs = *left;
        let assign = p.new_expr(
            E::Binary {
                op: OpCode::BinAssign,
                left: rhs,
                right: lhs,
            },
            body_loc,
        );
        // Optional `when COND` guard (LYK-767): wrap the assignment in
        // `if (COND) { … }` so it only fires when the guard holds.
        let when_cond: Option<Expr> = if p.lexer.is_contextual_keyword(b"when") {
            p.lexer.next()?;
            Some(p.parse_expr(Level::Assign)?)
        } else {
            None
        };
        p.pop_scope();
        p.pop_scope();
        let body_stmt = match when_cond {
            Some(cond) => {
                let assign_stmt = p.s(
                    S::SExpr {
                        value: assign,
                        ..Default::default()
                    },
                    body_loc,
                );
                p.s(
                    S::If {
                        test_: cond,
                        yes: assign_stmt,
                        no: None,
                    },
                    body_loc,
                )
            }
            None => p.s(
                S::SExpr {
                    value: assign,
                    ..Default::default()
                },
                body_loc,
            ),
        };
        *left = Self::build_reactive_effect_from_stmt(p, op_loc, body_loc, body_stmt, loc)?;
        Ok(Continuation::Next)
    }

    // Parabun: `A -> fn` → effect(() => { fn(A); }).
    fn sfx_t_minus_greater_than(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        let loc = left.loc;
        let op_loc = p.lexer.loc();
        p.lexer.next()?;
        // body_loc sits inside the operator (op_loc+1) so it is strictly
        // between op_loc and the RHS — avoids colliding with an arrow RHS's
        // own scope loc.
        let body_loc = bun_ast::Loc { start: op_loc.start + 1 };
        p.push_scope_for_parse_pass(scope::Kind::FunctionArgs, op_loc)?;
        p.push_scope_for_parse_pass(scope::Kind::FunctionBody, body_loc)?;
        let rhs = p.parse_expr(Level::Assign)?;
        // The RHS must be a callable target (identifier / member / index) — not
        // a bare call, literal, or arrow.
        if !matches!(
            rhs.data,
            ExprData::EIdentifier(_) | ExprData::EDot(_) | ExprData::EIndex(_)
        ) {
            p.pop_scope();
            p.pop_scope();
            p.log().add_error(
                Some(p.source),
                op_loc,
                b"`->` requires a callable target on the right" as &[u8],
            );
            return Err(err!("SyntaxError"));
        }
        let lhs = *left;
        let call = p.new_expr(
            E::Call {
                target: rhs,
                args: ExprNodeList::init_one(lhs),
                ..Default::default()
            },
            body_loc,
        );
        // Optional `when COND` guard: wrap the call in `if (COND) { … }`.
        let when_cond: Option<Expr> = if p.lexer.is_contextual_keyword(b"when") {
            p.lexer.next()?;
            Some(p.parse_expr(Level::Assign)?)
        } else {
            None
        };
        p.pop_scope();
        p.pop_scope();
        let body_stmt = match when_cond {
            Some(cond) => {
                let call_stmt = p.s(
                    S::SExpr {
                        value: call,
                        ..Default::default()
                    },
                    body_loc,
                );
                p.s(
                    S::If {
                        test_: cond,
                        yes: call_stmt,
                        no: None,
                    },
                    body_loc,
                )
            }
            None => p.s(
                S::SExpr {
                    value: call,
                    ..Default::default()
                },
                body_loc,
            ),
        };
        *left = Self::build_reactive_effect_from_stmt(p, op_loc, body_loc, body_stmt, loc)?;
        Ok(Continuation::Next)
    }

    fn sfx_t_dot_dot_exclamation(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        Self::sfx_chain_op(p, level, left, b"catch")
    }
    fn sfx_t_dot_dot_ampersand(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        Self::sfx_chain_op(p, level, left, b"finally")
    }
    fn sfx_t_dot_dot_greater_than(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        Self::sfx_chain_op(p, level, left, b"then")
    }

    fn sfx_t_bar_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinBitwiseOrAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_ampersand(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::BitwiseAnd) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::BitwiseAnd)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinBitwiseAnd,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_ampersand_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinBitwiseAndAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_caret(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::BitwiseXor) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::BitwiseXor)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinBitwiseXor,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_caret_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinBitwiseXorAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_equals(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Assign) {
            return Ok(Continuation::Done);
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Assign.sub(1))?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinAssign,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_in(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Compare) || !p.allow_in {
            return Ok(Continuation::Done);
        }

        // Warn about "!a in b" instead of "!(a in b)"
        if let ExprData::EUnary(unary) = &left.data {
            if unary.op == OpCode::UnNot {
                // TODO:
                // p.log.addRangeWarning(source: ?Source, r: Range, text: string)
            }
        }

        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Compare)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinIn,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    fn sfx_t_instanceof(p: &mut Self, level: Level, left: &mut Expr) -> CResult {
        if level.gte(Level::Compare) {
            return Ok(Continuation::Done);
        }

        // Warn about "!a instanceof b" instead of "!(a instanceof b)". Here's an
        // example of code with this problem: https://github.com/mrdoob/three.js/pull/11182.
        if !p.options.suppress_warnings_about_weird_code {
            if let ExprData::EUnary(unary) = &left.data {
                if unary.op == OpCode::UnNot {
                    // TODO:
                    // p.log.addRangeWarning(source: ?Source, r: Range, text: string)
                }
            }
        }
        p.lexer.next()?;
        let loc = left.loc;
        let prev = *left;
        let right = p.parse_expr(Level::Compare)?;
        *left = p.new_expr(
            E::Binary {
                op: OpCode::BinInstanceof,
                left: prev,
                right,
            },
            loc,
        );
        Ok(Continuation::Next)
    }

    pub fn parse_suffix(
        &mut self,
        left: &mut Expr,
        level: Level,
        mut errors: Option<&mut DeferredErrors>,
        flags: EFlags,
    ) -> Result<(), Error> {
        let p = self;
        // PORT NOTE: Zig kept a separate `left_value` local + `left = &left_value`
        // to work around a Zig codegen bug ("creates a new address to stack locals
        // each & usage"). Rust has no such bug, so we mutate `left` directly and
        // drop the trailing/deferred `left_and_out.* = left_value` writebacks.

        let mut optional_chain: Option<OptionalChain> = None;
        loop {
            if p.lexer.loc().start == p.after_arrow_body_loc.start {
                // PORT NOTE: Zig labeled-switch `next_token: switch (...) { continue :next_token ... }`
                // becomes a plain loop re-reading `p.lexer.token` each iteration.
                loop {
                    match p.lexer.token {
                        T::TComma => {
                            if level.gte(Level::Comma) {
                                return Ok(());
                            }

                            p.lexer.next()?;
                            let loc = left.loc;
                            let prev = *left;
                            let right = p.parse_expr(Level::Comma)?;
                            *left = p.new_expr(
                                E::Binary {
                                    op: OpCode::BinComma,
                                    left: prev,
                                    right,
                                },
                                loc,
                            );

                            continue;
                        }
                        _ => {
                            return Ok(());
                        }
                    }
                }
            }

            if Self::IS_TYPESCRIPT_ENABLED {
                // Stop now if this token is forbidden to follow a TypeScript "as" cast
                if p.forbid_suffix_after_as_loc.start > -1
                    && p.lexer.loc().start == p.forbid_suffix_after_as_loc.start
                {
                    break;
                }
            }

            // Reset the optional chain flag by default. That way we won't accidentally
            // treat "c.d" as OptionalChainContinue in "a?.b + c.d".
            let old_optional_chain = optional_chain;
            optional_chain = None;

            // Parabun: `LHS is …` membership operator (contextual keyword,
            // relational precedence).
            if p.lexer.is_para
                && !p.lexer.has_newline_before
                && level.lt(Level::Compare)
                && p.lexer.is_contextual_keyword(b"is")
            {
                Self::sfx_is_membership(p, left)?;
                continue;
            }

            // Each of these tokens are split into a function to conserve
            // stack space. Currently in Zig, the compiler does not reuse
            // stack space between scopes This means that having a large
            // function with many scopes and local variables consumes
            // enormous amounts of stack space.
            //
            // PORT NOTE: Zig used `inline ... => |tag| @field(@This(), @tagName(tag))(p, level, left)`
            // for comptime name-based dispatch. Rust has no @field/@tagName reflection, so each
            // arm is written out explicitly.
            let continuation = match p.lexer.token {
                T::TAmpersand => Self::sfx_t_ampersand(p, level, left),
                T::TAmpersandAmpersandEquals => {
                    Self::sfx_t_ampersand_ampersand_equals(p, level, left)
                }
                T::TAmpersandEquals => Self::sfx_t_ampersand_equals(p, level, left),
                T::TAsterisk => Self::sfx_t_asterisk(p, level, left),
                T::TAsteriskAsterisk => Self::sfx_t_asterisk_asterisk(p, level, left),
                T::TAsteriskAsteriskEquals => Self::sfx_t_asterisk_asterisk_equals(p, level, left),
                T::TAsteriskEquals => Self::sfx_t_asterisk_equals(p, level, left),
                T::TBar => Self::sfx_t_bar(p, level, left),
                T::TBarGreaterThan => Self::sfx_t_bar_greater_than(p, level, left),
                T::TDotDot => Self::sfx_t_dot_dot(p, level, left),
                T::TDotDotEquals => Self::sfx_t_dot_dot_equals(p, level, left),
                T::TDotDotExclamation => Self::sfx_t_dot_dot_exclamation(p, level, left),
                T::TDotDotAmpersand => Self::sfx_t_dot_dot_ampersand(p, level, left),
                T::TDotDotGreaterThan => Self::sfx_t_dot_dot_greater_than(p, level, left),
                T::TTildeGreaterThan => Self::sfx_t_tilde_greater_than(p, level, left),
                T::TMinusGreaterThan => Self::sfx_t_minus_greater_than(p, level, left),
                T::TBarBarEquals => Self::sfx_t_bar_bar_equals(p, level, left),
                T::TBarEquals => Self::sfx_t_bar_equals(p, level, left),
                T::TCaret => Self::sfx_t_caret(p, level, left),
                T::TCaretEquals => Self::sfx_t_caret_equals(p, level, left),
                T::TComma => Self::sfx_t_comma(p, level, left),
                T::TEquals => Self::sfx_t_equals(p, level, left),
                T::TEqualsEquals => Self::sfx_t_equals_equals(p, level, left),
                T::TEqualsEqualsEquals => Self::sfx_t_equals_equals_equals(p, level, left),
                T::TExclamationEquals => Self::sfx_t_exclamation_equals(p, level, left),
                T::TExclamationEqualsEquals => {
                    Self::sfx_t_exclamation_equals_equals(p, level, left)
                }
                T::TGreaterThan => Self::sfx_t_greater_than(p, level, left),
                T::TGreaterThanEquals => Self::sfx_t_greater_than_equals(p, level, left),
                T::TGreaterThanGreaterThan => Self::sfx_t_greater_than_greater_than(p, level, left),
                T::TGreaterThanGreaterThanEquals => {
                    Self::sfx_t_greater_than_greater_than_equals(p, level, left)
                }
                T::TGreaterThanGreaterThanGreaterThan => {
                    Self::sfx_t_greater_than_greater_than_greater_than(p, level, left)
                }
                T::TGreaterThanGreaterThanGreaterThanEquals => {
                    Self::sfx_t_greater_than_greater_than_greater_than_equals(p, level, left)
                }
                T::TIn => Self::sfx_t_in(p, level, left),
                T::TInstanceof => Self::sfx_t_instanceof(p, level, left),
                T::TLessThanEquals => Self::sfx_t_less_than_equals(p, level, left),
                T::TLessThanLessThanEquals => {
                    Self::sfx_t_less_than_less_than_equals(p, level, left)
                }
                T::TMinus => Self::sfx_t_minus(p, level, left),
                T::TMinusEquals => Self::sfx_t_minus_equals(p, level, left),
                T::TMinusMinus => Self::sfx_t_minus_minus(p, level, left),
                T::TPercent => Self::sfx_t_percent(p, level, left),
                T::TPercentEquals => Self::sfx_t_percent_equals(p, level, left),
                T::TPlus => Self::sfx_t_plus(p, level, left),
                T::TPlusEquals => Self::sfx_t_plus_equals(p, level, left),
                T::TPlusPlus => Self::sfx_t_plus_plus(p, level, left),
                T::TQuestionQuestion => Self::sfx_t_question_question(p, level, left),
                T::TQuestionQuestionEquals => Self::sfx_t_question_question_equals(p, level, left),
                T::TSlash => Self::sfx_t_slash(p, level, left),
                T::TSlashEquals => Self::sfx_t_slash_equals(p, level, left),
                T::TExclamation => {
                    Self::sfx_t_exclamation(p, &mut optional_chain, old_optional_chain)
                }
                T::TBarBar => Self::sfx_t_bar_bar(p, level, left, flags),
                T::TAmpersandAmpersand => Self::sfx_t_ampersand_ampersand(p, level, left, flags),
                T::TQuestion => Self::sfx_t_question(p, level, errors.as_deref_mut(), left),
                T::TQuestionDot => Self::sfx_t_question_dot(p, level, &mut optional_chain, left),
                T::TTemplateHead => Self::sfx_t_template_head(
                    p,
                    level,
                    &mut optional_chain,
                    old_optional_chain,
                    left,
                ),
                T::TLessThan => {
                    Self::sfx_t_less_than(p, level, &mut optional_chain, old_optional_chain, left)
                }
                T::TOpenParen => {
                    Self::sfx_t_open_paren(p, level, &mut optional_chain, old_optional_chain, left)
                }
                T::TNoSubstitutionTemplateLiteral => Self::sfx_t_no_substitution_template_literal(
                    p,
                    level,
                    &mut optional_chain,
                    old_optional_chain,
                    left,
                ),
                T::TOpenBracket => Self::sfx_t_open_bracket(
                    p,
                    &mut optional_chain,
                    old_optional_chain,
                    left,
                    flags,
                ),
                T::TDot => Self::sfx_t_dot(p, &mut optional_chain, old_optional_chain, left),
                T::TLessThanLessThan => Self::sfx_t_less_than_less_than(
                    p,
                    level,
                    &mut optional_chain,
                    old_optional_chain,
                    left,
                ),
                _ => Self::sfx_handle_typescript_as(p, level),
            };

            match continuation? {
                Continuation::Next => {}
                Continuation::Done => break,
            }
        }

        Ok(())
    }
}

// ported from: src/js_parser/ast/parseSuffix.zig
