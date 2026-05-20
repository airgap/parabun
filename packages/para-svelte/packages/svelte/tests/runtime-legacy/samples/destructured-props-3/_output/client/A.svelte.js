import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<div> </div>`);

export default function A($$anchor, $$props) {
	$.push($$props, false);

	const $k = () => $.store_get(k, '$k', $$stores);
	const $n = () => $.store_get(n, '$n', $$stores);
	const $c = () => $.store_get(c(), '$c', $$stores);
	const $f = () => $.store_get(f(), '$f', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const { i, j, k } = { i: 9, j: 10, k: writable(11) };
	const l = 12;
	const m = 13;
	const n = writable(14);

	let tmp = { a: 9, b: 10, c: writable(11) },
		a = $.prop($$props, 'a', 28, () => tmp.a),
		b = tmp.b,
		c = $.prop($$props, 'c', 28, () => tmp.c);

	let d = $.prop($$props, 'd', 12, 12);
	let e = 13;
	let f = $.prop($$props, 'f', 28, () => writable(14));

	var $$exports = {
		i,
		k,
		l,
		n,
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		},

		get c() {
			return c();
		},

		set c($$value) {
			c($$value);
			$.flush();
		},

		get d() {
			return d();
		},

		set d($$value) {
			d($$value);
			$.flush();
		},

		get f() {
			return f();
		},

		set f($$value) {
			f($$value);
			$.flush();
		}
	};

	$.init();

	var div = root();
	var text = $.child(div);

	$.reset(div);
	$.template_effect(() => $.set_text(text, `i: ${i ?? ''}, j: ${j ?? ''}, k: ${$k() ?? ''}, l: 12, m: 13, n: ${$n() ?? ''}, a: ${a() ?? ''}, b: ${b ?? ''}, c: ${$c() ?? ''}, d: ${d() ?? ''}, e: 13, f: ${$f() ?? ''}`));
	$.append($$anchor, div);
	$.bind_prop($$props, 'i', i);
	$.bind_prop($$props, 'k', k);
	$.bind_prop($$props, 'l', l);
	$.bind_prop($$props, 'n', n);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}