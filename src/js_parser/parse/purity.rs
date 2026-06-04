//! Parabun purity enforcement for `pure function` / `pure (…) => …`.
//!
//! Runs as a *localized parse-time walk* over a freshly-parsed pure function
//! body, emitting parser errors (surfaced by `Bun.Transpiler.transformSync`)
//! for impure constructs. Only ever invoked from the `pure` parse hooks in
//! `parse_stmt` / `parse_prefix`, so non-pure code — and the rest of the
//! parser — is completely untouched.
//!
//! Spec / golden assertions: `test/bundler/transpiler/parabun-purity.test.js`.
//! The non-blocking editor mirror lives in `editors/lsp/parabun-lsp.ts`
//! (`findPureViolations`); the test file is authoritative for the exact
//! diagnostic strings emitted here.
//!
//! Rules (all scoped to the pure function body; *nested non-pure* functions /
//! methods reset every rule, arrows inherit them):
//!   * `this` / `arguments` / `delete` are rejected.
//!   * impure bare globals (`console`, `fetch`, …) referenced anywhere.
//!   * impure member reads (`Math.random`, `Date.now`, …).
//!   * `Date(…)` calls and zero-arg `new Date()` (but `new Date(ts)` is fine).
//!   * mutation of a parameter (assign / compound / `++`/`--` / property+index
//!     writes), including via an inherited inner arrow and destructured params.
//!   * a *free* variable in a **nested** pure function (module-level pure
//!     functions get a pass — the identifier may be an import / forward ref /
//!     ambient global).

use std::collections::HashSet;

use crate::p::P;
use bun_ast as js_ast;
use bun_collections::VecExt;
use js_ast::b::B as BData;
use js_ast::scope;
use js_ast::{AssignTarget, Binding, Expr, ExprData, OpCode, Stmt, StmtData};

type PurityResult<T> = core::result::Result<T, bun_core::Error>;

/// Impure bare globals — any reference (read or call target) is rejected.
const IMPURE_GLOBALS: &[&[u8]] = &[
    b"console",
    b"fetch",
    b"process",
    b"globalThis",
    b"setTimeout",
    b"setInterval",
    b"setImmediate",
    b"queueMicrotask",
    b"eval",
];

/// Impure member reads `(object, property)` — non-deterministic / I/O sources.
const IMPURE_MEMBERS: &[(&[u8], &[u8])] = &[
    (b"Math", b"random"),
    (b"Date", b"now"),
    (b"performance", b"now"),
    (b"crypto", b"randomUUID"),
    (b"crypto", b"getRandomValues"),
];

/// Globals referentially-transparent enough to reference freely from a nested
/// pure function (so they are not flagged as "free variables").
const PURE_SAFE_GLOBALS: &[&[u8]] = &[
    b"Math",
    b"JSON",
    b"Object",
    b"Array",
    b"String",
    b"Number",
    b"Boolean",
    b"BigInt",
    b"Symbol",
    b"parseInt",
    b"parseFloat",
    b"isNaN",
    b"isFinite",
    b"encodeURI",
    b"encodeURIComponent",
    b"decodeURI",
    b"decodeURIComponent",
    b"structuredClone",
    b"atob",
    b"btoa",
    b"Intl",
    b"Reflect",
    b"Error",
    b"TypeError",
    b"RangeError",
    b"ReferenceError",
    b"SyntaxError",
    b"Int8Array",
    b"Uint8Array",
    b"Uint8ClampedArray",
    b"Int16Array",
    b"Uint16Array",
    b"Int32Array",
    b"Uint32Array",
    b"Float32Array",
    b"Float64Array",
    b"BigInt64Array",
    b"BigUint64Array",
    b"ArrayBuffer",
    b"DataView",
    b"Map",
    b"Set",
    b"WeakMap",
    b"WeakSet",
    b"RegExp",
    b"Promise",
    // `Date` as a bare read is fine; `Date()` / `new Date()` are handled by the
    // call/new-specific rules below, not the free-variable rule.
    b"Date",
    b"undefined",
    b"NaN",
    b"Infinity",
];

fn is_impure_global(n: &[u8]) -> bool {
    IMPURE_GLOBALS.iter().any(|g| *g == n)
}

fn is_pure_safe_global(n: &[u8]) -> bool {
    PURE_SAFE_GLOBALS.iter().any(|g| *g == n)
}

fn is_impure_member(obj: &[u8], prop: &[u8]) -> bool {
    IMPURE_MEMBERS.iter().any(|(o, p)| *o == obj && *p == prop)
}

/// Immutable analysis context shared across the recursive walk.
struct Ctx<'a> {
    /// Parameter names protected against mutation (incl. destructured).
    params: HashSet<&'a [u8]>,
    /// Every name bound anywhere in the body subtree (params + locals + nested
    /// declarations). Over-approximated on purpose: a superset only ever makes
    /// the free-variable check *more* permissive, never spuriously rejecting.
    bound: HashSet<&'a [u8]>,
    /// True when the pure function is lexically nested inside another function.
    is_nested: bool,
}

impl<'a, const TYPESCRIPT: bool, const SCAN_ONLY: bool> P<'a, TYPESCRIPT, SCAN_ONLY> {
    /// True when the current scope is lexically inside a function body/args
    /// (i.e. the pure function being declared is *nested*, not module-level).
    pub(crate) fn purity_is_nested(&self) -> bool {
        let mut s = self.current_scope_ref();
        loop {
            match s.kind {
                scope::Kind::FunctionArgs | scope::Kind::FunctionBody => return true,
                scope::Kind::Entry => return false,
                _ => {}
            }
            match s.parent {
                Some(parent) => s = parent,
                None => return false,
            }
        }
    }

    /// True when `name` is declared as a member of the current scope or any
    /// enclosing scope. During enforcement no parsing happens, so the pure
    /// function's own (already-popped) scopes are absent and `current_scope` is
    /// the scope lexically enclosing the pure function — exactly the chain a
    /// free reference would resolve against (outer-function locals, module
    /// declarations, …).
    fn name_in_enclosing_scope(&self, name: &[u8]) -> bool {
        let mut s = self.current_scope_ref();
        loop {
            if s.members.contains_key(name) {
                return true;
            }
            match s.parent {
                Some(parent) => s = parent,
                None => return false,
            }
        }
    }

    /// Enforce purity on a parsed `pure function` statement, returning the
    /// statement unchanged (valid bodies) or an `Err` after logging the first
    /// batch of violations.
    pub(crate) fn enforce_purity_on_stmt(&mut self, stmt: Stmt) -> PurityResult<Stmt> {
        let is_nested = self.purity_is_nested();
        if let StmtData::SFunction(f) = &stmt.data {
            let name = f.func.name.and_then(|n| n.ref_).map(|r| self.load_name_from_ref(r));
            let args = f.func.args;
            let body = f.func.body.stmts;
            self.enforce_purity(args.slice(), body.slice(), name, is_nested)?;
        }
        Ok(stmt)
    }

    /// Enforce purity on a parsed `pure (…) => …` / `pure function () {}`
    /// expression.
    pub(crate) fn enforce_purity_on_expr(&mut self, expr: Expr) -> PurityResult<Expr> {
        let is_nested = self.purity_is_nested();
        match &expr.data {
            ExprData::EArrow(a) => {
                let args = a.args;
                let body = a.body.stmts;
                self.enforce_purity(args.slice(), body.slice(), None, is_nested)?;
            }
            ExprData::EFunction(f) => {
                let name =
                    f.func.name.and_then(|n| n.ref_).map(|r| self.load_name_from_ref(r));
                let args = f.func.args;
                let body = f.func.body.stmts;
                self.enforce_purity(args.slice(), body.slice(), name, is_nested)?;
            }
            _ => {}
        }
        Ok(expr)
    }

    fn enforce_purity(
        &mut self,
        args: &'a [js_ast::g::Arg],
        body: &'a [Stmt],
        fn_name: Option<&'a [u8]>,
        is_nested: bool,
    ) -> PurityResult<()> {
        let mut params: HashSet<&'a [u8]> = HashSet::new();
        for arg in args {
            self.collect_binding_names(&arg.binding, &mut params);
        }

        let mut bound: HashSet<&'a [u8]> = params.clone();
        if let Some(n) = fn_name {
            bound.insert(n);
        }
        for stmt in body {
            self.collect_stmt_bindings(stmt, &mut bound);
        }

        let ctx = Ctx { params, bound, is_nested };
        let mut err = false;
        for stmt in body {
            self.purity_walk_stmt(stmt, &ctx, &mut err);
        }
        if err {
            return Err(bun_core::err!("SyntaxError"));
        }
        Ok(())
    }

    // ── diagnostics ────────────────────────────────────────────────────────

    fn purity_err(&self, loc: js_ast::Loc, args: core::fmt::Arguments<'_>, err: &mut bool) {
        self.log().add_error_fmt(Some(self.source), loc, args);
        *err = true;
    }

    // ── binding collection (over-approximate; recurses everywhere) ──────────

    fn collect_binding_names(&self, b: &Binding, out: &mut HashSet<&'a [u8]>) {
        match &b.data {
            BData::BIdentifier(id) => {
                out.insert(self.load_name_from_ref(id.r#ref));
            }
            BData::BArray(arr) => {
                for item in arr.items() {
                    self.collect_binding_names(&item.binding, out);
                }
            }
            BData::BObject(obj) => {
                for prop in obj.properties() {
                    self.collect_binding_names(&prop.value, out);
                }
            }
            BData::BMissing(_) => {}
        }
    }

    fn collect_stmt_bindings(&self, s: &Stmt, out: &mut HashSet<&'a [u8]>) {
        match &s.data {
            StmtData::SLocal(l) => {
                for decl in l.decls.iter() {
                    self.collect_binding_names(&decl.binding, out);
                    if let Some(v) = decl.value {
                        self.collect_expr_bindings(&v, out);
                    }
                }
            }
            StmtData::SFunction(f) => {
                if let Some(r) = f.func.name.and_then(|n| n.ref_) {
                    out.insert(self.load_name_from_ref(r));
                }
                for arg in f.func.args.slice() {
                    self.collect_binding_names(&arg.binding, out);
                }
                for st in f.func.body.stmts.slice() {
                    self.collect_stmt_bindings(st, out);
                }
            }
            StmtData::SClass(c) => {
                if let Some(r) = c.class.class_name.and_then(|n| n.ref_) {
                    out.insert(self.load_name_from_ref(r));
                }
            }
            StmtData::SBlock(b) => {
                for st in b.stmts.slice() {
                    self.collect_stmt_bindings(st, out);
                }
            }
            StmtData::SIf(i) => {
                self.collect_stmt_bindings(&i.yes, out);
                if let Some(no) = i.no {
                    self.collect_stmt_bindings(&no, out);
                }
            }
            StmtData::SFor(f) => {
                if let Some(init) = f.init {
                    self.collect_stmt_bindings(&init, out);
                }
                self.collect_stmt_bindings(&f.body, out);
            }
            StmtData::SForIn(f) => {
                self.collect_stmt_bindings(&f.init, out);
                self.collect_stmt_bindings(&f.body, out);
            }
            StmtData::SForOf(f) => {
                self.collect_stmt_bindings(&f.init, out);
                self.collect_stmt_bindings(&f.body, out);
            }
            StmtData::SWhile(w) => self.collect_stmt_bindings(&w.body, out),
            StmtData::SDoWhile(d) => self.collect_stmt_bindings(&d.body, out),
            StmtData::SLabel(l) => self.collect_stmt_bindings(&l.stmt, out),
            StmtData::SWith(w) => self.collect_stmt_bindings(&w.body, out),
            StmtData::STry(t) => {
                for st in t.body.slice() {
                    self.collect_stmt_bindings(st, out);
                }
                if let Some(catch) = &t.catch_ {
                    if let Some(binding) = &catch.binding {
                        self.collect_binding_names(binding, out);
                    }
                    for st in catch.body.slice() {
                        self.collect_stmt_bindings(st, out);
                    }
                }
                if let Some(finally) = &t.finally {
                    for st in finally.stmts.slice() {
                        self.collect_stmt_bindings(st, out);
                    }
                }
            }
            StmtData::SSwitch(sw) => {
                for case in sw.cases.slice() {
                    for st in case.body.slice() {
                        self.collect_stmt_bindings(st, out);
                    }
                }
            }
            StmtData::SExpr(e) => self.collect_expr_bindings(&e.value, out),
            StmtData::SReturn(r) => {
                if let Some(v) = r.value {
                    self.collect_expr_bindings(&v, out);
                }
            }
            StmtData::SThrow(t) => self.collect_expr_bindings(&t.value, out),
            _ => {}
        }
    }

    /// Collect binding names introduced *inside* an expression (arrow / function
    /// expression params + names). Over-approximation only.
    fn collect_expr_bindings(&self, e: &Expr, out: &mut HashSet<&'a [u8]>) {
        match &e.data {
            ExprData::EArrow(a) => {
                for arg in a.args.slice() {
                    self.collect_binding_names(&arg.binding, out);
                }
                for st in a.body.stmts.slice() {
                    self.collect_stmt_bindings(st, out);
                }
            }
            ExprData::EFunction(f) => {
                if let Some(r) = f.func.name.and_then(|n| n.ref_) {
                    out.insert(self.load_name_from_ref(r));
                }
                for arg in f.func.args.slice() {
                    self.collect_binding_names(&arg.binding, out);
                }
                for st in f.func.body.stmts.slice() {
                    self.collect_stmt_bindings(st, out);
                }
            }
            ExprData::EBinary(b) => {
                self.collect_expr_bindings(&b.left, out);
                self.collect_expr_bindings(&b.right, out);
            }
            ExprData::EUnary(u) => self.collect_expr_bindings(&u.value, out),
            ExprData::ECall(c) => {
                self.collect_expr_bindings(&c.target, out);
                for a in c.args.slice() {
                    self.collect_expr_bindings(a, out);
                }
            }
            ExprData::ENew(n) => {
                self.collect_expr_bindings(&n.target, out);
                for a in n.args.slice() {
                    self.collect_expr_bindings(a, out);
                }
            }
            ExprData::EDot(d) => self.collect_expr_bindings(&d.target, out),
            ExprData::EIndex(ix) => {
                self.collect_expr_bindings(&ix.target, out);
                self.collect_expr_bindings(&ix.index, out);
            }
            ExprData::EIf(i) => {
                self.collect_expr_bindings(&i.test_, out);
                self.collect_expr_bindings(&i.yes, out);
                self.collect_expr_bindings(&i.no, out);
            }
            ExprData::EArray(arr) => {
                for it in arr.items.slice() {
                    self.collect_expr_bindings(it, out);
                }
            }
            ExprData::EObject(o) => {
                for prop in o.properties.iter() {
                    if let Some(v) = prop.value {
                        self.collect_expr_bindings(&v, out);
                    }
                }
            }
            ExprData::ESpread(s) => self.collect_expr_bindings(&s.value, out),
            ExprData::EAwait(a) => self.collect_expr_bindings(&a.value, out),
            ExprData::EYield(y) => {
                if let Some(v) = y.value {
                    self.collect_expr_bindings(&v, out);
                }
            }
            ExprData::ETemplate(t) => {
                for part in t.parts.slice() {
                    self.collect_expr_bindings(&part.value, out);
                }
            }
            _ => {}
        }
    }

    // ── name helpers ───────────────────────────────────────────────────────

    fn ident_name(&self, e: &Expr) -> Option<&'a [u8]> {
        if let ExprData::EIdentifier(id) = &e.data {
            Some(self.load_name_from_ref(id.ref_))
        } else {
            None
        }
    }

    /// Walk a member/index chain down to its base identifier (the mutation root
    /// of an assignment target). `x.y.z` / `x[0]` → `x`.
    fn assign_root_name(&self, e: &Expr) -> Option<&'a [u8]> {
        match &e.data {
            ExprData::EIdentifier(id) => Some(self.load_name_from_ref(id.ref_)),
            ExprData::EDot(d) => self.assign_root_name(&d.target),
            ExprData::EIndex(ix) => self.assign_root_name(&ix.target),
            _ => None,
        }
    }

    fn check_param_mutation(&self, target: &Expr, ctx: &Ctx<'a>, err: &mut bool) {
        if let Some(root) = self.assign_root_name(target) {
            if ctx.params.contains(root) {
                let name = String::from_utf8_lossy(root);
                self.purity_err(
                    target.loc,
                    format_args!("Cannot mutate parameter \"{name}\" inside a pure function"),
                    err,
                );
            }
        }
    }

    fn check_ident_ref(&self, name: &'a [u8], loc: js_ast::Loc, ctx: &Ctx<'a>, err: &mut bool) {
        if name == b"arguments" {
            self.purity_err(
                loc,
                format_args!("Cannot use \"arguments\" inside a pure function"),
                err,
            );
            return;
        }
        if is_impure_global(name) && !ctx.bound.contains(name) {
            let n = String::from_utf8_lossy(name);
            self.purity_err(
                loc,
                format_args!("Cannot reference impure global \"{n}\" inside a pure function"),
                err,
            );
            return;
        }
        if ctx.is_nested
            && !ctx.bound.contains(name)
            && !is_pure_safe_global(name)
            && !self.name_in_enclosing_scope(name)
        {
            let n = String::from_utf8_lossy(name);
            self.purity_err(
                loc,
                format_args!("Cannot reference free variable \"{n}\" inside a pure function"),
                err,
            );
        }
    }

    // ── violation walk ─────────────────────────────────────────────────────

    fn purity_walk_stmt(&self, s: &Stmt, ctx: &Ctx<'a>, err: &mut bool) {
        match &s.data {
            StmtData::SExpr(e) => self.purity_walk_expr(&e.value, ctx, err),
            StmtData::SReturn(r) => {
                if let Some(v) = r.value {
                    self.purity_walk_expr(&v, ctx, err);
                }
            }
            StmtData::SThrow(t) => self.purity_walk_expr(&t.value, ctx, err),
            StmtData::SLocal(l) => {
                for decl in l.decls.iter() {
                    if let Some(v) = decl.value {
                        self.purity_walk_expr(&v, ctx, err);
                    }
                }
            }
            StmtData::SBlock(b) => {
                for st in b.stmts.slice() {
                    self.purity_walk_stmt(st, ctx, err);
                }
            }
            StmtData::SIf(i) => {
                self.purity_walk_expr(&i.test_, ctx, err);
                self.purity_walk_stmt(&i.yes, ctx, err);
                if let Some(no) = i.no {
                    self.purity_walk_stmt(&no, ctx, err);
                }
            }
            StmtData::SFor(f) => {
                if let Some(init) = f.init {
                    self.purity_walk_stmt(&init, ctx, err);
                }
                if let Some(t) = f.test_ {
                    self.purity_walk_expr(&t, ctx, err);
                }
                if let Some(u) = f.update {
                    self.purity_walk_expr(&u, ctx, err);
                }
                self.purity_walk_stmt(&f.body, ctx, err);
            }
            StmtData::SForIn(f) => {
                self.purity_walk_stmt(&f.init, ctx, err);
                self.purity_walk_expr(&f.value, ctx, err);
                self.purity_walk_stmt(&f.body, ctx, err);
            }
            StmtData::SForOf(f) => {
                self.purity_walk_stmt(&f.init, ctx, err);
                self.purity_walk_expr(&f.value, ctx, err);
                self.purity_walk_stmt(&f.body, ctx, err);
            }
            StmtData::SWhile(w) => {
                self.purity_walk_expr(&w.test_, ctx, err);
                self.purity_walk_stmt(&w.body, ctx, err);
            }
            StmtData::SDoWhile(d) => {
                self.purity_walk_stmt(&d.body, ctx, err);
                self.purity_walk_expr(&d.test_, ctx, err);
            }
            StmtData::SLabel(l) => self.purity_walk_stmt(&l.stmt, ctx, err),
            StmtData::SWith(w) => {
                self.purity_walk_expr(&w.value, ctx, err);
                self.purity_walk_stmt(&w.body, ctx, err);
            }
            StmtData::STry(t) => {
                for st in t.body.slice() {
                    self.purity_walk_stmt(st, ctx, err);
                }
                if let Some(catch) = &t.catch_ {
                    for st in catch.body.slice() {
                        self.purity_walk_stmt(st, ctx, err);
                    }
                }
                if let Some(finally) = &t.finally {
                    for st in finally.stmts.slice() {
                        self.purity_walk_stmt(st, ctx, err);
                    }
                }
            }
            StmtData::SSwitch(sw) => {
                self.purity_walk_expr(&sw.test_, ctx, err);
                for case in sw.cases.slice() {
                    if let Some(v) = case.value {
                        self.purity_walk_expr(&v, ctx, err);
                    }
                    for st in case.body.slice() {
                        self.purity_walk_stmt(st, ctx, err);
                    }
                }
            }
            // Nested non-pure functions/classes reset all purity rules — skip.
            StmtData::SFunction(_) | StmtData::SClass(_) => {}
            _ => {}
        }
    }

    fn purity_walk_expr(&self, e: &Expr, ctx: &Ctx<'a>, err: &mut bool) {
        match &e.data {
            ExprData::EThis(_) => {
                self.purity_err(
                    e.loc,
                    format_args!("Cannot use \"this\" inside a pure function"),
                    err,
                );
            }
            ExprData::EIdentifier(id) => {
                let name = self.load_name_from_ref(id.ref_);
                self.check_ident_ref(name, e.loc, ctx, err);
            }
            ExprData::EUnary(u) => {
                match u.op {
                    OpCode::UnDelete => self.purity_err(
                        e.loc,
                        format_args!("Cannot use \"delete\" inside a pure function"),
                        err,
                    ),
                    OpCode::UnPreInc
                    | OpCode::UnPreDec
                    | OpCode::UnPostInc
                    | OpCode::UnPostDec => self.check_param_mutation(&u.value, ctx, err),
                    _ => {}
                }
                self.purity_walk_expr(&u.value, ctx, err);
            }
            ExprData::EBinary(b) => {
                if b.op.binary_assign_target() != AssignTarget::None {
                    self.check_param_mutation(&b.left, ctx, err);
                }
                self.purity_walk_expr(&b.left, ctx, err);
                self.purity_walk_expr(&b.right, ctx, err);
            }
            ExprData::EDot(d) => {
                if let Some(obj) = self.ident_name(&d.target) {
                    let prop = d.name.slice();
                    if is_impure_member(obj, prop) {
                        let o = String::from_utf8_lossy(obj);
                        let p = String::from_utf8_lossy(prop);
                        self.purity_err(
                            e.loc,
                            format_args!(
                                "Cannot reference impure \"{o}.{p}\" inside a pure function"
                            ),
                            err,
                        );
                        return;
                    }
                }
                self.purity_walk_expr(&d.target, ctx, err);
            }
            ExprData::EIndex(ix) => {
                self.purity_walk_expr(&ix.target, ctx, err);
                self.purity_walk_expr(&ix.index, ctx, err);
            }
            ExprData::ECall(c) => {
                if let Some(t) = self.ident_name(&c.target) {
                    if t == b"Date" && !ctx.bound.contains(&b"Date"[..]) {
                        self.purity_err(
                            e.loc,
                            format_args!("Cannot call \"Date()\" inside a pure function"),
                            err,
                        );
                        for a in c.args.slice() {
                            self.purity_walk_expr(a, ctx, err);
                        }
                        return;
                    }
                }
                self.purity_walk_expr(&c.target, ctx, err);
                for a in c.args.slice() {
                    self.purity_walk_expr(a, ctx, err);
                }
            }
            ExprData::ENew(n) => {
                if let Some(t) = self.ident_name(&n.target) {
                    if t == b"Date" && n.args.slice().is_empty() && !ctx.bound.contains(&b"Date"[..])
                    {
                        self.purity_err(
                            e.loc,
                            format_args!("Cannot call \"new Date()\" inside a pure function"),
                            err,
                        );
                    }
                }
                self.purity_walk_expr(&n.target, ctx, err);
                for a in n.args.slice() {
                    self.purity_walk_expr(a, ctx, err);
                }
            }
            // Arrows inherit `this`/`arguments`/params — descend.
            ExprData::EArrow(a) => {
                for st in a.body.stmts.slice() {
                    self.purity_walk_stmt(st, ctx, err);
                }
            }
            // Nested non-pure functions/classes reset all purity rules — skip.
            ExprData::EFunction(_) | ExprData::EClass(_) => {}
            ExprData::EAwait(a) => self.purity_walk_expr(&a.value, ctx, err),
            ExprData::EYield(y) => {
                if let Some(v) = y.value {
                    self.purity_walk_expr(&v, ctx, err);
                }
            }
            ExprData::EIf(i) => {
                self.purity_walk_expr(&i.test_, ctx, err);
                self.purity_walk_expr(&i.yes, ctx, err);
                self.purity_walk_expr(&i.no, ctx, err);
            }
            ExprData::EArray(arr) => {
                for it in arr.items.slice() {
                    self.purity_walk_expr(it, ctx, err);
                }
            }
            ExprData::ESpread(s) => self.purity_walk_expr(&s.value, ctx, err),
            ExprData::EObject(o) => {
                for prop in o.properties.iter() {
                    if let Some(k) = prop.key {
                        self.purity_walk_expr(&k, ctx, err);
                    }
                    if let Some(v) = prop.value {
                        self.purity_walk_expr(&v, ctx, err);
                    }
                    if let Some(init) = prop.initializer {
                        self.purity_walk_expr(&init, ctx, err);
                    }
                }
            }
            ExprData::ETemplate(t) => {
                if let Some(tag) = t.tag {
                    self.purity_walk_expr(&tag, ctx, err);
                }
                for part in t.parts.slice() {
                    self.purity_walk_expr(&part.value, ctx, err);
                }
            }
            _ => {}
        }
    }
}
