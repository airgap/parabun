//! Parabun schema-DSL declarations: `schema NAME { field: type, … }`.
//!
//! Lowers a refinement-typed model declaration to a two-binding const:
//!   const __pa_NAME = (v) => { …field checks…; return Ok(v) },
//!         NAME = { ...<json-schema>, parse: __pa_NAME, validate: __pa_NAME, schema: <json-schema> };
//!
//! Also handles the JSON-Schema forms
//!   `schema NAME = <expr>`    → `const NAME = __paraSchemaDecl(import.meta.url, "NAME", <expr>)`
//!   `schema NAME from <expr>` → `const NAME = __paraSchemaIngest(import.meta.url, "NAME", <expr>)`
//! Declarations register in the runtime schema registry under
//! `<url>#NAME`; recursive references in `=` bodies lower to
//! `{ $ref: "#Name" }` at visit time (para_maybe_schema_ref).
//!
//! Ported faithfully from `parse_stmt.zig::parseModelStmt` and the
//! `build*Schema` / `build*MismatchTest` helper family. Spec:
//! `test/bundler/transpiler/parabun-schema-dsl.test.js` and `parabun-schema.test.js`.

use bun_collections::VecExt;

use crate::lexer::T;
use crate::p::P;
use bun_ast as js_ast;
use js_ast::g::PropertyKind;
use js_ast::{B, E, Expr, ExprNodeList, G, OpCode, S, Stmt, scope, symbol};

type SResult<T> = core::result::Result<T, bun_core::Error>;

struct ModelField<'a> {
    name: &'a [u8],
    type_name: &'a [u8],
    optional: bool,
    is_array: bool,
    range_min: Option<f64>,
    range_max: Option<f64>,
    inclusive_max: bool,
    array_min: Option<f64>,
    array_max: Option<f64>,
    array_inclusive_max: bool,
    literals: Option<&'a [Expr]>,
    loc: js_ast::Loc,
}

/// Capability modifiers on a schema declaration
/// (para-schema-recursion-plan.md §1.1/§2.2):
///   `cyclic [(x)] schema [(depth: n | unbounded)] NAME = …`
#[derive(Default, Clone, Copy)]
pub(crate) struct SchemaCaps {
    /// `Some(None)` = bare `cyclic` (cycles of any length);
    /// `Some(Some(x))` = `cyclic(x)` (cycles must close within x hops).
    pub cyclic: Option<Option<f64>>,
    /// `Some(None)` = `depth: unbounded`; `Some(Some(n))` = `depth: n`.
    pub depth: Option<Option<f64>>,
}

impl SchemaCaps {
    pub(crate) fn is_empty(&self) -> bool {
        self.cyclic.is_none() && self.depth.is_none()
    }
}

/// A config-list value scanned tolerantly before we know whether
/// `schema(…)` is a declaration or a plain call.
enum CfgVal<'a> {
    Num(f64),
    Ident(&'a [u8]),
}

impl<'a, const TYPESCRIPT: bool, const SCAN_ONLY: bool> P<'a, TYPESCRIPT, SCAN_ONLY> {
    // ── small expr builders ─────────────────────────────────────────────────

    fn sx_str(&mut self, s: &'a [u8], loc: js_ast::Loc) -> Expr {
        self.new_expr(E::EString::init(s), loc)
    }

    fn sx_num(&mut self, n: f64, loc: js_ast::Loc) -> Expr {
        self.new_expr(E::Number { value: n }, loc)
    }

    fn sx_dot(&mut self, target: Expr, name: &'a [u8], loc: js_ast::Loc) -> Expr {
        self.new_expr(
            E::Dot {
                target,
                name: E::Str::new(name),
                name_loc: loc,
                ..Default::default()
            },
            loc,
        )
    }

    fn sx_bin(&mut self, op: OpCode, left: Expr, right: Expr, loc: js_ast::Loc) -> Expr {
        self.new_expr(E::Binary { op, left, right }, loc)
    }

    fn sx_call1(&mut self, target: Expr, arg: Expr, loc: js_ast::Loc) -> Expr {
        self.new_expr(
            E::Call {
                target,
                args: ExprNodeList::init_one(arg),
                ..Default::default()
            },
            loc,
        )
    }

    fn sx_obj(&mut self, props: bun_alloc::ArenaVec<'_, G::Property>, loc: js_ast::Loc) -> Expr {
        self.new_expr(
            E::Object {
                properties: G::PropertyList::from_bump_vec(props),
                ..Default::default()
            },
            loc,
        )
    }

    fn sx_global(&mut self, name: &'a [u8], loc: js_ast::Loc) -> SResult<Expr> {
        let r = self.store_name_in_ref(name)?;
        Ok(self.new_expr(E::Identifier::init(r), loc))
    }

    // ── visit-time `$ref` rewrite (para-schema-recursion-plan.md §1.7) ─────

    /// Inside a schema body (`para_schema_body_depth > 0`), rewrite a bare
    /// reference to a `schema`-declared symbol into a registry reference:
    /// `items: Tree` → `items: { $ref: "#Tree" }`. Called from the object-
    /// property-value and array-element visit paths after the value has been
    /// visited, so the identifier's ref is already resolved — shadowed names
    /// resolve to the shadowing symbol and are correctly left alone. Only
    /// bare identifiers in value positions rewrite; a schema symbol used any
    /// other way (`Base.schema.properties`, `f(Base)`) keeps direct-object
    /// semantics.
    pub(crate) fn para_maybe_schema_ref(&mut self, value: &mut Expr) {
        if self.para_schema_body_depth == 0 {
            return;
        }
        let Some(ident) = value.data.e_identifier() else {
            return;
        };
        if !self.para_schema_symbols.contains_key(&ident.ref_) {
            return;
        }
        let name = self.symbols[ident.ref_.inner_index() as usize].original_name;
        let ref_str: &'a [u8] = bun_alloc::arena_format!(
            in self.arena,
            "#{}",
            std::str::from_utf8(name.slice()).unwrap_or("")
        )
        .into_bump_str()
        .as_bytes();
        let loc = value.loc;
        let key = self.sx_str(b"$ref", loc);
        let val = self.sx_str(ref_str, loc);
        let mut props: bun_alloc::ArenaVec<'_, G::Property> =
            bun_alloc::ArenaVec::new_in(self.arena);
        props.push(G::Property {
            key: Some(key),
            value: Some(val),
            ..Default::default()
        });
        *value = self.sx_obj(props, loc);
    }

    /// True when `target` is a parser-generated reference to a runtime helper
    /// whose trailing argument is a schema-literal body (`__paraSchemaDecl`
    /// for declarations, `__paraFromSchema` for inline `schema { … }`
    /// literals). `__paraSchemaIngest` (`schema X from <expr>`) is
    /// deliberately absent: `from` bodies are arbitrary runtime expressions,
    /// not schema literals, and must not have identifiers rewritten.
    pub(crate) fn para_is_schema_body_call(&self, target: &js_ast::ExprData) -> bool {
        let js_ast::ExprData::EImportIdentifier(ident) = target else {
            return false;
        };
        let r = ident.ref_;
        self.runtime_imports.__paraSchemaDecl == Some(r)
            || self.runtime_imports.__paraFromSchema == Some(r)
    }

    // ── entry: `schema NAME …` ──────────────────────────────────────────────

    /// After the `schema` keyword has been consumed: parse the optional
    /// config list (`(depth: 8)`) and the declared name, then delegate to
    /// `parse_model_stmt`. Returns `Ok(None)` when the token shape is NOT a
    /// declaration — `schema(foo)` with no trailing name is a plain call —
    /// so the caller restores its snapshot. Config VALIDATION errors
    /// (unknown key, duplicate key, bad value) only fire once the trailing
    /// identifier confirms the declaration shape (plan §1.2/§1.6).
    pub(crate) fn parse_schema_decl_after_kw(
        p: &mut Self,
        kw_loc: js_ast::Loc,
        is_export: bool,
        cyclic: Option<Option<f64>>,
    ) -> SResult<Option<Stmt>> {
        let mut caps = SchemaCaps {
            cyclic,
            depth: None,
        };

        if p.lexer.token == T::TOpenParen {
            p.lexer.next()?;
            // Tolerant shape scan: `ident ":" (num | ident)` entries with
            // optional trailing comma. Any deviation ⇒ not a config list ⇒
            // not a declaration.
            let mut entries: std::vec::Vec<(&'a [u8], js_ast::Range, CfgVal<'a>)> =
                std::vec::Vec::new();
            loop {
                if p.lexer.token == T::TCloseParen {
                    break;
                }
                if p.lexer.token != T::TIdentifier {
                    return Ok(None);
                }
                let key = p.lexer.identifier;
                let key_range = p.lexer.range();
                p.lexer.next()?;
                if p.lexer.token != T::TColon {
                    return Ok(None);
                }
                p.lexer.next()?;
                let val = match p.lexer.token {
                    T::TNumericLiteral => {
                        let v = CfgVal::Num(p.lexer.number);
                        p.lexer.next()?;
                        v
                    }
                    T::TIdentifier => {
                        let v = CfgVal::Ident(p.lexer.identifier);
                        p.lexer.next()?;
                        v
                    }
                    _ => return Ok(None),
                };
                entries.push((key, key_range, val));
                if p.lexer.token == T::TComma {
                    p.lexer.next()?;
                    continue;
                }
                if p.lexer.token == T::TCloseParen {
                    break;
                }
                return Ok(None);
            }
            p.lexer.next()?; // consume `)`

            if p.lexer.token != T::TIdentifier || p.lexer.has_newline_before {
                return Ok(None);
            }

            // Declaration confirmed — strict validation.
            for (key, key_range, val) in entries {
                if key != b"depth" {
                    p.log().add_range_error(
                        Some(p.source),
                        key_range,
                        b"unknown schema config key (v1 supports only `depth`)",
                    );
                    return Err(bun_core::err!("SyntaxError"));
                }
                if caps.depth.is_some() {
                    p.log().add_range_error(
                        Some(p.source),
                        key_range,
                        b"duplicate schema config key `depth`",
                    );
                    return Err(bun_core::err!("SyntaxError"));
                }
                caps.depth = match val {
                    CfgVal::Num(n) if n >= 0.0 && n.fract() == 0.0 => Some(Some(n)),
                    CfgVal::Ident(s) if s == b"unbounded" => Some(None),
                    _ => {
                        p.log().add_range_error(
                            Some(p.source),
                            key_range,
                            b"schema depth must be a non-negative integer literal or `unbounded`",
                        );
                        return Err(bun_core::err!("SyntaxError"));
                    }
                };
            }
        } else if p.lexer.token != T::TIdentifier || p.lexer.has_newline_before {
            return Ok(None);
        }

        Ok(Some(Self::parse_model_stmt(p, kw_loc, is_export, caps)?))
    }

    pub(crate) fn parse_model_stmt(
        p: &mut Self,
        model_loc: js_ast::Loc,
        is_export: bool,
        caps: SchemaCaps,
    ) -> SResult<Stmt> {
        let name = p.lexer.identifier;
        let name_loc = p.lexer.loc();
        let name_ref = p.declare_symbol(symbol::Kind::Constant, name_loc, name)?;
        p.lexer.next()?;

        // `schema NAME from <expr>` / `schema NAME = <expr>` — register the
        // declaration in the runtime schema registry under a stable ID
        // (`import.meta.url + "#NAME"`) and decorate it:
        //   `=`    → __paraSchemaDecl(import.meta.url, "NAME", <body>)
        //   `from` → __paraSchemaIngest(import.meta.url, "NAME", <expr>)
        // `=` bodies are schema literals: bare references to other `schema`
        // declarations in schema-value positions lower to `{ $ref: "#Name" }`
        // at visit time (see para_maybe_schema_ref), so recursive schemas are
        // acyclic JSON values resolved lazily through the registry — no
        // thunks, no TDZ, no cyclic object graphs. `from` bodies are
        // arbitrary runtime expressions and are left untouched.
        let is_from = p.lexer.token == T::TIdentifier && p.lexer.raw() == b"from";
        let is_eq = p.lexer.token == T::TEquals;
        if is_from || is_eq {
            p.lexer.next()?;
            let schema_expr = p.parse_expr(js_ast::op::Level::Lowest)?;

            p.para_schema_symbols.insert(name_ref, ());
            p.has_import_meta = true;
            let import_meta = p.new_expr(E::ImportMeta {}, model_loc);
            let url = p.sx_dot(import_meta, b"url", model_loc);
            let name_arg = p.sx_str(name, name_loc);
            let helper: &'static [u8] = if is_eq {
                b"__paraSchemaDecl"
            } else {
                b"__paraSchemaIngest"
            };
            // Capability bits ride as a 4th argument only when declared
            // (plan §2.2): `{ cyclic: true|x, depth: n|"unbounded" }`.
            let arg_list = if caps.is_empty() {
                let args = [url, name_arg, schema_expr];
                ExprNodeList::from_slice(&args)
            } else {
                let mut cap_props: bun_alloc::ArenaVec<'_, G::Property> =
                    bun_alloc::ArenaVec::new_in(p.arena);
                if let Some(cy) = caps.cyclic {
                    let key = p.sx_str(b"cyclic", model_loc);
                    let val = match cy {
                        Some(x) => p.sx_num(x, model_loc),
                        None => p.new_expr(E::Boolean { value: true }, model_loc),
                    };
                    cap_props.push(G::Property {
                        key: Some(key),
                        value: Some(val),
                        ..Default::default()
                    });
                }
                if let Some(d) = caps.depth {
                    let key = p.sx_str(b"depth", model_loc);
                    let val = match d {
                        Some(n) => p.sx_num(n, model_loc),
                        None => p.sx_str(b"unbounded", model_loc),
                    };
                    cap_props.push(G::Property {
                        key: Some(key),
                        value: Some(val),
                        ..Default::default()
                    });
                }
                let caps_obj = p.sx_obj(cap_props, model_loc);
                let args = [url, name_arg, schema_expr, caps_obj];
                ExprNodeList::from_slice(&args)
            };
            let call = p.call_runtime(model_loc, helper, arg_list);
            let binding = p.b(B::Identifier { r#ref: name_ref }, name_loc);
            let decl = G::Decl {
                binding,
                value: Some(call),
            };
            return Ok(p.s(
                S::Local {
                    kind: js_ast::s::Kind::KConst,
                    decls: G::DeclList::from_arena_slice(&[decl]),
                    is_export,
                    ..Default::default()
                },
                model_loc,
            ));
        }

        // The DSL braces form has no registry lowering yet, so capability
        // modifiers have nowhere to land — reject rather than silently drop
        // (plan grammar only defines them for the `=`/`from` forms anyway).
        if !caps.is_empty() {
            p.log().add_range_error(
                Some(p.source),
                crate::lexer::range_of_identifier(p.source, model_loc),
                b"cyclic/config modifiers require the `schema NAME = ...` or `schema NAME from ...` form",
            );
            return Err(bun_core::err!("SyntaxError"));
        }

        p.lexer.expect(T::TOpenBrace)?;

        // Parse the field declarations.
        let mut fields: std::vec::Vec<ModelField<'a>> = std::vec::Vec::new();
        while p.lexer.token != T::TCloseBrace {
            if p.lexer.token != T::TIdentifier {
                break;
            }
            let field_name = p.lexer.identifier;
            let field_loc = p.lexer.loc();
            p.lexer.next()?;
            p.lexer.expect(T::TColon)?;

            let mut type_name: &'a [u8] = b"";
            let mut is_array = false;
            let mut range_min: Option<f64> = None;
            let mut range_max: Option<f64> = None;
            let mut inclusive_max = false;
            let mut array_min: Option<f64> = None;
            let mut array_max: Option<f64> = None;
            let mut array_inclusive_max = false;
            let mut literals: Option<&'a [Expr]> = None;

            if p.lexer.token == T::TStringLiteral || p.lexer.token == T::TNumericLiteral {
                // Literal-union: `"a" | "b" | 42`.
                let mut lits: std::vec::Vec<Expr> = std::vec::Vec::new();
                loop {
                    if p.lexer.token == T::TStringLiteral {
                        let s = p.lexer.to_e_string()?;
                        let loc = p.lexer.loc();
                        let e = p.new_expr(s, loc);
                        lits.push(e);
                        p.lexer.next()?;
                    } else if p.lexer.token == T::TNumericLiteral {
                        let e = p.sx_num(p.lexer.number, p.lexer.loc());
                        lits.push(e);
                        p.lexer.next()?;
                    } else {
                        break;
                    }
                    if p.lexer.token == T::TBar {
                        p.lexer.next()?;
                    } else {
                        break;
                    }
                }
                literals = Some(p.arena.alloc_slice_copy(&lits));
            } else {
                if p.lexer.token == T::TOpenBracket {
                    is_array = true;
                    p.lexer.next()?;
                }
                if p.lexer.token != T::TIdentifier {
                    break;
                }
                type_name = p.lexer.identifier;
                p.lexer.next()?;

                // Inner-value range refinement: `int(0..150)` / `str(1..=100)`.
                if !is_array && p.lexer.token == T::TOpenParen {
                    p.lexer.next()?;
                    if p.lexer.token == T::TNumericLiteral {
                        range_min = Some(p.lexer.number);
                        p.lexer.next()?;
                    }
                    if p.lexer.token == T::TDotDotEquals {
                        inclusive_max = true;
                        p.lexer.next()?;
                    } else if p.lexer.token == T::TDotDot {
                        p.lexer.next()?;
                    }
                    if p.lexer.token == T::TNumericLiteral {
                        range_max = Some(p.lexer.number);
                        p.lexer.next()?;
                    }
                    p.lexer.expect(T::TCloseParen)?;
                }

                if is_array {
                    p.lexer.expect(T::TCloseBracket)?;
                    // Array-length bounds: `[T](1..=10)`.
                    if p.lexer.token == T::TOpenParen {
                        p.lexer.next()?;
                        if p.lexer.token == T::TNumericLiteral {
                            array_min = Some(p.lexer.number);
                            p.lexer.next()?;
                        }
                        if p.lexer.token == T::TDotDotEquals {
                            array_inclusive_max = true;
                            p.lexer.next()?;
                        } else if p.lexer.token == T::TDotDot {
                            p.lexer.next()?;
                        }
                        if p.lexer.token == T::TNumericLiteral {
                            array_max = Some(p.lexer.number);
                            p.lexer.next()?;
                        }
                        p.lexer.expect(T::TCloseParen)?;
                    }
                }
            }

            let optional = p.lexer.token == T::TQuestion;
            if optional {
                p.lexer.next()?;
            }
            fields.push(ModelField {
                name: field_name,
                type_name,
                optional,
                is_array,
                range_min,
                range_max,
                inclusive_max,
                array_min,
                array_max,
                array_inclusive_max,
                literals,
                loc: field_loc,
            });
            if p.lexer.token == T::TComma || p.lexer.token == T::TSemicolon {
                p.lexer.next()?;
            } else {
                break;
            }
        }
        p.lexer.expect(T::TCloseBrace)?;

        // Synthesize the validator arrow `(v) => { … }`.
        let args_loc = model_loc;
        let body_loc = js_ast::Loc {
            start: args_loc.start + 1,
        };
        p.push_scope_for_parse_pass(scope::Kind::FunctionArgs, args_loc)?;
        let v_ref = p.declare_symbol(symbol::Kind::Hoisted, args_loc, b"v")?;
        p.push_scope_for_parse_pass(scope::Kind::FunctionBody, body_loc)?;

        let mut stmts: std::vec::Vec<Stmt> = std::vec::Vec::new();

        // Outer object check: typeof v !== "object" || v === null.
        {
            let v0 = p.new_expr(E::Identifier::init(v_ref), body_loc);
            let typeof_v = p.new_expr(
                E::Unary {
                    op: OpCode::UnTypeof,
                    value: v0,
                    flags: Default::default(),
                },
                body_loc,
            );
            let obj_str = p.sx_str(b"object", body_loc);
            let not_object = p.sx_bin(OpCode::BinStrictNe, typeof_v, obj_str, body_loc);
            let v1 = p.new_expr(E::Identifier::init(v_ref), body_loc);
            let null_e = p.new_expr(E::Null {}, body_loc);
            let v_null = p.sx_bin(OpCode::BinStrictEq, v1, null_e, body_loc);
            let test = p.sx_bin(OpCode::BinLogicalOr, not_object, v_null, body_loc);
            let err = Self::build_result_err(p, b"expected object", body_loc);
            let ret = p.s(S::Return { value: Some(err) }, body_loc);
            stmts.push(p.s(
                S::If {
                    test_: test,
                    yes: ret,
                    no: None,
                },
                body_loc,
            ));
        }

        // Per-field checks.
        for i in 0..fields.len() {
            let floc = fields[i].loc;
            let fname = fields[i].name;
            let ftype = fields[i].type_name;
            let optional = fields[i].optional;
            let is_array = fields[i].is_array;

            let field_access_base = |p: &mut Self| -> Expr {
                let v = p.new_expr(E::Identifier::init(v_ref), body_loc);
                p.sx_dot(v, fname, floc)
            };

            let mut test_opt: Option<Expr> = if let Some(lits) = fields[i].literals {
                let fa = field_access_base(p);
                Self::build_literal_union_mismatch(p, fa, lits, floc)
            } else if is_array {
                let inner_args = js_ast::Loc {
                    start: floc.start + 1,
                };
                let inner_body = js_ast::Loc {
                    start: floc.start + 2,
                };
                let fa = field_access_base(p);
                Self::build_array_mismatch_test(p, fa, ftype, floc, inner_args, inner_body)?
            } else {
                let fa = field_access_base(p);
                Self::build_type_mismatch_test(p, fa, ftype, floc)?
            };

            // Layer the inner-value range refinement.
            if fields[i].range_min.is_some() || fields[i].range_max.is_some() {
                let fa = field_access_base(p);
                if let Some(range_test) = Self::build_range_mismatch(
                    p,
                    fa,
                    ftype,
                    fields[i].range_min,
                    fields[i].range_max,
                    fields[i].inclusive_max,
                    floc,
                ) {
                    test_opt = Some(match test_opt {
                        Some(existing) => {
                            p.sx_bin(OpCode::BinLogicalOr, existing, range_test, floc)
                        }
                        None => range_test,
                    });
                }
            }

            // Array-length bounds.
            if is_array && (fields[i].array_min.is_some() || fields[i].array_max.is_some()) {
                let fa = field_access_base(p);
                if let Some(len_test) = Self::build_array_length_mismatch(
                    p,
                    fa,
                    fields[i].array_min,
                    fields[i].array_max,
                    fields[i].array_inclusive_max,
                    floc,
                ) {
                    test_opt = Some(match test_opt {
                        Some(existing) => p.sx_bin(OpCode::BinLogicalOr, existing, len_test, floc),
                        None => len_test,
                    });
                }
            }

            if let Some(raw_test) = test_opt {
                // Optional-presence gate.
                let test = if optional {
                    let fa1 = field_access_base(p);
                    let undef = p.new_expr(E::Undefined {}, floc);
                    let not_undef = p.sx_bin(OpCode::BinStrictNe, fa1, undef, floc);
                    let fa2 = field_access_base(p);
                    let null_e = p.new_expr(E::Null {}, floc);
                    let not_null = p.sx_bin(OpCode::BinStrictNe, fa2, null_e, floc);
                    let present = p.sx_bin(OpCode::BinLogicalAnd, not_undef, not_null, floc);
                    p.sx_bin(OpCode::BinLogicalAnd, present, raw_test, floc)
                } else {
                    raw_test
                };

                let msg: &'a [u8] = if fields[i].literals.is_some() {
                    bun_alloc::arena_format!(in p.arena, "{}: expected one of the allowed literals", std::str::from_utf8(fname).unwrap_or(""))
                        .into_bump_str()
                        .as_bytes()
                } else if is_array {
                    bun_alloc::arena_format!(in p.arena, "{}: expected [{}]", std::str::from_utf8(fname).unwrap_or(""), std::str::from_utf8(ftype).unwrap_or(""))
                        .into_bump_str()
                        .as_bytes()
                } else {
                    bun_alloc::arena_format!(in p.arena, "{}: expected {}", std::str::from_utf8(fname).unwrap_or(""), std::str::from_utf8(ftype).unwrap_or(""))
                        .into_bump_str()
                        .as_bytes()
                };
                let err = Self::build_result_err(p, msg, floc);
                let ret = p.s(S::Return { value: Some(err) }, floc);
                stmts.push(p.s(
                    S::If {
                        test_: test,
                        yes: ret,
                        no: None,
                    },
                    floc,
                ));
            }
        }

        // Final: return Ok(v).
        {
            let v = p.new_expr(E::Identifier::init(v_ref), body_loc);
            let ok = Self::build_result_ok(p, v, body_loc);
            stmts.push(p.s(S::Return { value: Some(ok) }, body_loc));
        }

        p.pop_scope();
        p.pop_scope();

        let body_stmts: &'a mut [Stmt] = p.arena.alloc_slice_copy(&stmts);
        let v_binding = p.b(B::Identifier { r#ref: v_ref }, args_loc);
        let arrow_arg = G::Arg {
            binding: v_binding,
            ..Default::default()
        };
        let arrow_args: &'a mut [G::Arg] = core::slice::from_mut(p.arena.alloc(arrow_arg));
        let arrow = p.new_expr(
            E::Arrow {
                args: js_ast::StoreSlice::new_mut(arrow_args),
                prefer_expr: false,
                body: G::FnBody {
                    loc: body_loc,
                    stmts: js_ast::StoreSlice::new_mut(body_stmts),
                },
                ..Default::default()
            },
            args_loc,
        );

        // JSON Schema object (built twice — once for the spread, once for the
        // `schema:` slot; both are read-only literals so duplication is safe).
        let schema_for_spread = Self::build_model_schema(p, &fields, body_loc);
        let schema_for_slot = Self::build_model_schema(p, &fields, body_loc);

        // const __pa_NAME = <arrow>, NAME = { ...schema, parse, validate, schema }
        let fn_name: &'a [u8] = bun_alloc::arena_format!(in p.arena, "__pa_{}", std::str::from_utf8(name).unwrap_or(""))
            .into_bump_str()
            .as_bytes();
        let fn_ref = p.declare_symbol(symbol::Kind::Constant, name_loc, fn_name)?;
        let parse_ident = p.new_expr(E::Identifier::init(fn_ref), body_loc);
        let validate_ident = p.new_expr(E::Identifier::init(fn_ref), body_loc);

        let mut model_props: bun_alloc::ArenaVec<'_, G::Property> =
            bun_alloc::ArenaVec::new_in(p.arena);
        model_props.push(G::Property {
            kind: PropertyKind::Spread,
            value: Some(schema_for_spread),
            ..Default::default()
        });
        let parse_key = p.sx_str(b"parse", body_loc);
        model_props.push(G::Property {
            key: Some(parse_key),
            value: Some(parse_ident),
            ..Default::default()
        });
        let validate_key = p.sx_str(b"validate", body_loc);
        model_props.push(G::Property {
            key: Some(validate_key),
            value: Some(validate_ident),
            ..Default::default()
        });
        let schema_key = p.sx_str(b"schema", body_loc);
        model_props.push(G::Property {
            key: Some(schema_key),
            value: Some(schema_for_slot),
            ..Default::default()
        });
        let model_obj = p.sx_obj(model_props, model_loc);

        let fn_binding = p.b(B::Identifier { r#ref: fn_ref }, name_loc);
        let name_binding = p.b(B::Identifier { r#ref: name_ref }, name_loc);
        let decls = [
            G::Decl {
                binding: fn_binding,
                value: Some(arrow),
            },
            G::Decl {
                binding: name_binding,
                value: Some(model_obj),
            },
        ];
        Ok(p.s(
            S::Local {
                kind: js_ast::s::Kind::KConst,
                decls: G::DeclList::from_arena_slice(&decls),
                is_export,
                ..Default::default()
            },
            model_loc,
        ))
    }

    // ── mismatch tests ──────────────────────────────────────────────────────

    /// Returns a test expression that is TRUE when the value is INVALID, or
    /// `None` for unknown lowercase type names (permissive default).
    fn build_type_mismatch_test(
        p: &mut Self,
        field_access: Expr,
        type_name: &'a [u8],
        loc: js_ast::Loc,
    ) -> SResult<Option<Expr>> {
        let typeof_field = p.new_expr(
            E::Unary {
                op: OpCode::UnTypeof,
                value: field_access,
                flags: Default::default(),
            },
            loc,
        );
        let inner: Option<Expr> = match type_name {
            b"int" => {
                let num_str = p.sx_str(b"number", loc);
                let not_num = p.sx_bin(OpCode::BinStrictNe, typeof_field, num_str, loc);
                let number_id = p.sx_global(b"Number", loc)?;
                let is_int_dot = p.sx_dot(number_id, b"isInteger", loc);
                let is_int_call = p.sx_call1(is_int_dot, field_access, loc);
                let not_int = p.new_expr(
                    E::Unary {
                        op: OpCode::UnNot,
                        value: is_int_call,
                        flags: Default::default(),
                    },
                    loc,
                );
                Some(p.sx_bin(OpCode::BinLogicalOr, not_num, not_int, loc))
            }
            b"str" | b"string" => {
                let s = p.sx_str(b"string", loc);
                Some(p.sx_bin(OpCode::BinStrictNe, typeof_field, s, loc))
            }
            b"bool" | b"boolean" => {
                let s = p.sx_str(b"boolean", loc);
                Some(p.sx_bin(OpCode::BinStrictNe, typeof_field, s, loc))
            }
            b"float" | b"num" | b"number" => {
                let s = p.sx_str(b"number", loc);
                Some(p.sx_bin(OpCode::BinStrictNe, typeof_field, s, loc))
            }
            b"Email" => Self::build_string_regex_mismatch(
                p,
                field_access,
                typeof_field,
                br"/^[^\s@]+@[^\s@]+\.[^\s@]+$/",
                loc,
            ),
            b"UUID" => Self::build_string_regex_mismatch(
                p,
                field_access,
                typeof_field,
                br"/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i",
                loc,
            ),
            b"Url" => Self::build_string_regex_mismatch(
                p,
                field_access,
                typeof_field,
                br"/^[a-z][a-z0-9+.-]*:\/\/[^\s]+$/i",
                loc,
            ),
            b"IpV4" => Self::build_string_regex_mismatch(
                p,
                field_access,
                typeof_field,
                br"/^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/",
                loc,
            ),
            b"IpV6" => Self::build_string_regex_mismatch(
                p,
                field_access,
                typeof_field,
                br"/^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$|^([0-9a-f]{1,4}:){1,7}:$|^::([0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4}$|^([0-9a-f]{1,4}:){1,6}(:[0-9a-f]{1,4})+$/i",
                loc,
            ),
            b"Date" => Self::build_string_regex_mismatch(
                p,
                field_access,
                typeof_field,
                br"/^\d{4}-\d{2}-\d{2}$/",
                loc,
            ),
            b"DateTime" => Self::build_string_regex_mismatch(
                p,
                field_access,
                typeof_field,
                br"/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/",
                loc,
            ),
            b"Slug" => Self::build_string_regex_mismatch(
                p,
                field_access,
                typeof_field,
                br"/^[a-z0-9]+(-[a-z0-9]+)*$/",
                loc,
            ),
            _ if type_name.first().is_some_and(|c| c.is_ascii_uppercase()) => {
                // Capitalized → nested model reference: `TypeName.parse(f).tag !== "Ok"`.
                let r = p.store_name_in_ref(type_name)?;
                let type_id = p.new_expr(E::Identifier::init(r), loc);
                let parse_dot = p.sx_dot(type_id, b"parse", loc);
                let parse_call = p.sx_call1(parse_dot, field_access, loc);
                let tag = p.sx_dot(parse_call, b"tag", loc);
                let ok = p.sx_str(b"Ok", loc);
                Some(p.sx_bin(OpCode::BinStrictNe, tag, ok, loc))
            }
            _ => None,
        };
        Ok(inner)
    }

    fn build_string_regex_mismatch(
        p: &mut Self,
        field_access: Expr,
        typeof_field: Expr,
        regex_literal: &'a [u8],
        loc: js_ast::Loc,
    ) -> Option<Expr> {
        let str_str = p.sx_str(b"string", loc);
        let not_str = p.sx_bin(OpCode::BinStrictNe, typeof_field, str_str, loc);
        let regex = p.new_expr(
            E::RegExp {
                value: E::Str::new(regex_literal),
                flags_offset: None,
            },
            loc,
        );
        let test_dot = p.sx_dot(regex, b"test", loc);
        let test_call = p.sx_call1(test_dot, field_access, loc);
        let not_test = p.new_expr(
            E::Unary {
                op: OpCode::UnNot,
                value: test_call,
                flags: Default::default(),
            },
            loc,
        );
        Some(p.sx_bin(OpCode::BinLogicalOr, not_str, not_test, loc))
    }

    fn build_literal_union_mismatch(
        p: &mut Self,
        field_access: Expr,
        literals: &[Expr],
        loc: js_ast::Loc,
    ) -> Option<Expr> {
        let mut combined: Option<Expr> = None;
        for lit in literals {
            let ne = p.sx_bin(OpCode::BinStrictNe, field_access, *lit, loc);
            combined = Some(match combined {
                Some(existing) => p.sx_bin(OpCode::BinLogicalAnd, existing, ne, loc),
                None => ne,
            });
        }
        combined
    }

    fn build_array_length_mismatch(
        p: &mut Self,
        field_access: Expr,
        min: Option<f64>,
        max: Option<f64>,
        inclusive_max: bool,
        loc: js_ast::Loc,
    ) -> Option<Expr> {
        let len = p.sx_dot(field_access, b"length", loc);
        let mut combined: Option<Expr> = None;
        if let Some(min_val) = min {
            let n = p.sx_num(min_val, loc);
            combined = Some(p.sx_bin(OpCode::BinLt, len, n, loc));
        }
        if let Some(max_val) = max {
            let n = p.sx_num(max_val, loc);
            let op = if inclusive_max {
                OpCode::BinGt
            } else {
                OpCode::BinGe
            };
            let gt = p.sx_bin(op, len, n, loc);
            combined = Some(match combined {
                Some(existing) => p.sx_bin(OpCode::BinLogicalOr, existing, gt, loc),
                None => gt,
            });
        }
        combined
    }

    fn build_range_mismatch(
        p: &mut Self,
        field_access: Expr,
        type_name: &[u8],
        min: Option<f64>,
        max: Option<f64>,
        inclusive_max: bool,
        loc: js_ast::Loc,
    ) -> Option<Expr> {
        let is_string = matches!(type_name, b"str" | b"string");
        let compare = if is_string {
            p.sx_dot(field_access, b"length", loc)
        } else {
            field_access
        };
        let mut combined: Option<Expr> = None;
        if let Some(min_val) = min {
            let n = p.sx_num(min_val, loc);
            combined = Some(p.sx_bin(OpCode::BinLt, compare, n, loc));
        }
        if let Some(max_val) = max {
            let n = p.sx_num(max_val, loc);
            let op = if inclusive_max {
                OpCode::BinGt
            } else {
                OpCode::BinGe
            };
            let gt = p.sx_bin(op, compare, n, loc);
            combined = Some(match combined {
                Some(existing) => p.sx_bin(OpCode::BinLogicalOr, existing, gt, loc),
                None => gt,
            });
        }
        combined
    }

    fn build_array_mismatch_test(
        p: &mut Self,
        field_access: Expr,
        inner_type: &'a [u8],
        loc: js_ast::Loc,
        inner_args_loc: js_ast::Loc,
        inner_body_loc: js_ast::Loc,
    ) -> SResult<Option<Expr>> {
        let array_id = p.sx_global(b"Array", loc)?;
        let is_array_dot = p.sx_dot(array_id, b"isArray", loc);
        let is_array_call = p.sx_call1(is_array_dot, field_access, loc);
        let not_array = p.new_expr(
            E::Unary {
                op: OpCode::UnNot,
                value: is_array_call,
                flags: Default::default(),
            },
            loc,
        );

        // .some((x) => <inner-mismatch>(x)) — needs its own arrow scopes.
        p.push_scope_for_parse_pass(scope::Kind::FunctionArgs, inner_args_loc)?;
        let x_ref = p.declare_symbol(symbol::Kind::Hoisted, inner_args_loc, b"x")?;
        p.push_scope_for_parse_pass(scope::Kind::FunctionBody, inner_body_loc)?;
        let x_expr = p.new_expr(E::Identifier::init(x_ref), inner_args_loc);
        let inner_mismatch = Self::build_type_mismatch_test(p, x_expr, inner_type, inner_args_loc)?;
        p.pop_scope();
        p.pop_scope();

        let inner_check = match inner_mismatch {
            Some(inner) => {
                let ret = p.s(S::Return { value: Some(inner) }, inner_body_loc);
                let body_stmts: &'a mut [Stmt] = p.arena.alloc_slice_copy(&[ret]);
                let x_binding = p.b(B::Identifier { r#ref: x_ref }, inner_args_loc);
                let some_arg = G::Arg {
                    binding: x_binding,
                    ..Default::default()
                };
                let some_args: &'a mut [G::Arg] = core::slice::from_mut(p.arena.alloc(some_arg));
                let some_arrow = p.new_expr(
                    E::Arrow {
                        args: js_ast::StoreSlice::new_mut(some_args),
                        prefer_expr: true,
                        body: G::FnBody {
                            loc: inner_body_loc,
                            stmts: js_ast::StoreSlice::new_mut(body_stmts),
                        },
                        ..Default::default()
                    },
                    inner_args_loc,
                );
                let some_dot = p.sx_dot(field_access, b"some", loc);
                let some_call = p.sx_call1(some_dot, some_arrow, loc);
                p.sx_bin(OpCode::BinLogicalOr, not_array, some_call, loc)
            }
            None => not_array,
        };
        Ok(Some(inner_check))
    }

    // ── result literals ─────────────────────────────────────────────────────

    fn build_result_ok(p: &mut Self, value: Expr, loc: js_ast::Loc) -> Expr {
        let mut props: bun_alloc::ArenaVec<'_, G::Property> = bun_alloc::ArenaVec::new_in(p.arena);
        let tag_key = p.sx_str(b"tag", loc);
        let tag_val = p.sx_str(b"Ok", loc);
        props.push(G::Property {
            key: Some(tag_key),
            value: Some(tag_val),
            ..Default::default()
        });
        let val_key = p.sx_str(b"value", loc);
        props.push(G::Property {
            key: Some(val_key),
            value: Some(value),
            ..Default::default()
        });
        p.sx_obj(props, loc)
    }

    fn build_result_err(p: &mut Self, msg: &'a [u8], loc: js_ast::Loc) -> Expr {
        let mut props: bun_alloc::ArenaVec<'_, G::Property> = bun_alloc::ArenaVec::new_in(p.arena);
        let tag_key = p.sx_str(b"tag", loc);
        let tag_val = p.sx_str(b"Err", loc);
        props.push(G::Property {
            key: Some(tag_key),
            value: Some(tag_val),
            ..Default::default()
        });
        let err_key = p.sx_str(b"error", loc);
        let err_val = p.sx_str(msg, loc);
        props.push(G::Property {
            key: Some(err_key),
            value: Some(err_val),
            ..Default::default()
        });
        p.sx_obj(props, loc)
    }

    // ── JSON Schema codegen ─────────────────────────────────────────────────

    fn build_model_schema(p: &mut Self, fields: &[ModelField<'a>], loc: js_ast::Loc) -> Expr {
        let mut prop_props: bun_alloc::ArenaVec<'_, G::Property> =
            bun_alloc::ArenaVec::new_in(p.arena);
        for i in 0..fields.len() {
            let key = p.sx_str(fields[i].name, loc);
            let value = Self::build_field_schema(p, &fields[i], loc);
            prop_props.push(G::Property {
                key: Some(key),
                value: Some(value),
                ..Default::default()
            });
        }
        let properties_obj = p.sx_obj(prop_props, loc);

        let mut req_items: std::vec::Vec<Expr> = std::vec::Vec::new();
        for f in fields {
            if !f.optional {
                let e = p.sx_str(f.name, loc);
                req_items.push(e);
            }
        }
        let required_arr = p.new_expr(
            E::Array {
                items: ExprNodeList::from_slice(&req_items),
                ..Default::default()
            },
            loc,
        );

        let mut top: bun_alloc::ArenaVec<'_, G::Property> = bun_alloc::ArenaVec::new_in(p.arena);
        let type_key = p.sx_str(b"type", loc);
        let type_val = p.sx_str(b"object", loc);
        top.push(G::Property {
            key: Some(type_key),
            value: Some(type_val),
            ..Default::default()
        });
        let props_key = p.sx_str(b"properties", loc);
        top.push(G::Property {
            key: Some(props_key),
            value: Some(properties_obj),
            ..Default::default()
        });
        let req_key = p.sx_str(b"required", loc);
        top.push(G::Property {
            key: Some(req_key),
            value: Some(required_arr),
            ..Default::default()
        });
        p.sx_obj(top, loc)
    }

    fn build_field_schema(p: &mut Self, field: &ModelField<'a>, loc: js_ast::Loc) -> Expr {
        if let Some(lits) = field.literals {
            let enum_arr = p.new_expr(
                E::Array {
                    items: ExprNodeList::from_slice(lits),
                    ..Default::default()
                },
                loc,
            );
            let mut props: bun_alloc::ArenaVec<'_, G::Property> =
                bun_alloc::ArenaVec::new_in(p.arena);
            let enum_key = p.sx_str(b"enum", loc);
            props.push(G::Property {
                key: Some(enum_key),
                value: Some(enum_arr),
                ..Default::default()
            });
            return p.sx_obj(props, loc);
        }

        if field.is_array {
            let mut props: bun_alloc::ArenaVec<'_, G::Property> =
                bun_alloc::ArenaVec::new_in(p.arena);
            let type_key = p.sx_str(b"type", loc);
            let type_val = p.sx_str(b"array", loc);
            props.push(G::Property {
                key: Some(type_key),
                value: Some(type_val),
                ..Default::default()
            });
            let items_val =
                Self::build_base_type_schema(p, field.type_name, None, None, false, loc);
            let items_key = p.sx_str(b"items", loc);
            props.push(G::Property {
                key: Some(items_key),
                value: Some(items_val),
                ..Default::default()
            });
            if let Some(amin) = field.array_min {
                let n = p.sx_num(amin, loc);
                let k = p.sx_str(b"minItems", loc);
                props.push(G::Property {
                    key: Some(k),
                    value: Some(n),
                    ..Default::default()
                });
            }
            if let Some(amax) = field.array_max {
                let json_max = if field.array_inclusive_max {
                    amax
                } else {
                    amax - 1.0
                };
                let n = p.sx_num(json_max, loc);
                let k = p.sx_str(b"maxItems", loc);
                props.push(G::Property {
                    key: Some(k),
                    value: Some(n),
                    ..Default::default()
                });
            }
            return p.sx_obj(props, loc);
        }

        Self::build_base_type_schema(
            p,
            field.type_name,
            field.range_min,
            field.range_max,
            field.inclusive_max,
            loc,
        )
    }

    fn build_base_type_schema(
        p: &mut Self,
        type_name: &'a [u8],
        range_min: Option<f64>,
        range_max: Option<f64>,
        inclusive_max: bool,
        loc: js_ast::Loc,
    ) -> Expr {
        match type_name {
            b"int" => Self::numeric_schema(p, b"integer", range_min, range_max, inclusive_max, loc),
            b"float" | b"num" | b"number" => {
                Self::numeric_schema(p, b"number", range_min, range_max, inclusive_max, loc)
            }
            b"str" | b"string" => {
                Self::string_schema(p, None, None, range_min, range_max, inclusive_max, loc)
            }
            b"bool" | b"boolean" => Self::single_type_schema(p, b"boolean", loc),
            b"Email" => Self::string_schema(p, Some(b"email"), None, None, None, false, loc),
            b"UUID" => Self::string_schema(p, Some(b"uuid"), None, None, None, false, loc),
            b"Url" => Self::string_schema(p, Some(b"uri"), None, None, None, false, loc),
            b"Date" => Self::string_schema(p, Some(b"date"), None, None, None, false, loc),
            b"DateTime" => Self::string_schema(p, Some(b"date-time"), None, None, None, false, loc),
            b"IpV4" => Self::string_schema(p, Some(b"ipv4"), None, None, None, false, loc),
            b"IpV6" => Self::string_schema(p, Some(b"ipv6"), None, None, None, false, loc),
            b"Slug" => Self::string_schema(
                p,
                None,
                Some(b"^[a-z0-9]+(-[a-z0-9]+)*$"),
                None,
                None,
                false,
                loc,
            ),
            _ if type_name.first().is_some_and(|c| c.is_ascii_uppercase()) => {
                // Nested model reference → `<TypeName>.schema`.
                let r = p
                    .store_name_in_ref(type_name)
                    .unwrap_or(js_ast::base::Ref::NONE);
                let id = p.new_expr(E::Identifier::init(r), loc);
                p.sx_dot(id, b"schema", loc)
            }
            _ => {
                let props: bun_alloc::ArenaVec<'_, G::Property> =
                    bun_alloc::ArenaVec::new_in(p.arena);
                p.sx_obj(props, loc)
            }
        }
    }

    fn single_type_schema(p: &mut Self, type_str: &'a [u8], loc: js_ast::Loc) -> Expr {
        let mut props: bun_alloc::ArenaVec<'_, G::Property> = bun_alloc::ArenaVec::new_in(p.arena);
        let k = p.sx_str(b"type", loc);
        let v = p.sx_str(type_str, loc);
        props.push(G::Property {
            key: Some(k),
            value: Some(v),
            ..Default::default()
        });
        p.sx_obj(props, loc)
    }

    fn numeric_schema(
        p: &mut Self,
        type_str: &'a [u8],
        min: Option<f64>,
        max: Option<f64>,
        inclusive_max: bool,
        loc: js_ast::Loc,
    ) -> Expr {
        let mut props: bun_alloc::ArenaVec<'_, G::Property> = bun_alloc::ArenaVec::new_in(p.arena);
        let k = p.sx_str(b"type", loc);
        let v = p.sx_str(type_str, loc);
        props.push(G::Property {
            key: Some(k),
            value: Some(v),
            ..Default::default()
        });
        if let Some(min_v) = min {
            let kk = p.sx_str(b"minimum", loc);
            let vv = p.sx_num(min_v, loc);
            props.push(G::Property {
                key: Some(kk),
                value: Some(vv),
                ..Default::default()
            });
        }
        if let Some(max_v) = max {
            let key_b: &[u8] = if inclusive_max {
                b"maximum"
            } else {
                b"exclusiveMaximum"
            };
            let kk = p.sx_str(key_b, loc);
            let vv = p.sx_num(max_v, loc);
            props.push(G::Property {
                key: Some(kk),
                value: Some(vv),
                ..Default::default()
            });
        }
        p.sx_obj(props, loc)
    }

    fn string_schema(
        p: &mut Self,
        format: Option<&'a [u8]>,
        pattern: Option<&'a [u8]>,
        min: Option<f64>,
        max: Option<f64>,
        inclusive_max: bool,
        loc: js_ast::Loc,
    ) -> Expr {
        let mut props: bun_alloc::ArenaVec<'_, G::Property> = bun_alloc::ArenaVec::new_in(p.arena);
        let k = p.sx_str(b"type", loc);
        let v = p.sx_str(b"string", loc);
        props.push(G::Property {
            key: Some(k),
            value: Some(v),
            ..Default::default()
        });
        if let Some(fmt) = format {
            let kk = p.sx_str(b"format", loc);
            let vv = p.sx_str(fmt, loc);
            props.push(G::Property {
                key: Some(kk),
                value: Some(vv),
                ..Default::default()
            });
        }
        if let Some(pat) = pattern {
            let kk = p.sx_str(b"pattern", loc);
            let vv = p.sx_str(pat, loc);
            props.push(G::Property {
                key: Some(kk),
                value: Some(vv),
                ..Default::default()
            });
        }
        if let Some(min_v) = min {
            let kk = p.sx_str(b"minLength", loc);
            let vv = p.sx_num(min_v, loc);
            props.push(G::Property {
                key: Some(kk),
                value: Some(vv),
                ..Default::default()
            });
        }
        if let Some(max_v) = max {
            let v = if inclusive_max { max_v } else { max_v - 1.0 };
            let kk = p.sx_str(b"maxLength", loc);
            let vv = p.sx_num(v, loc);
            props.push(G::Property {
                key: Some(kk),
                value: Some(vv),
                ..Default::default()
            });
        }
        p.sx_obj(props, loc)
    }
}
