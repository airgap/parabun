import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<div> </div> <div> </div>`, 1);

export default function A_1($$anchor, $$props) {
	$.push($$props, false);

	const $d_three = () => $.store_get(d_three(), '$d_three', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();

	const THING = {
		a: 1,
		b: { c: 2, d: [3, 4, writable(5), 6, 7] },
		e: [6],
		h: 8
	};

	const default_g = 9;

	let tmp = THING,
		$$array = $.derived(() => $.to_array(tmp.b.d)),
		$$array_1 = $.derived(() => $.to_array($.get($$array).slice(1))),
		$$array_2 = $.derived(() => $.to_array($.get($$array_1).slice(1))),
		$$array_3 = $.derived(() => $.to_array(tmp.e, 1)),
		a = $.prop($$props, 'a', 28, () => tmp.a),
		c = $.prop($$props, 'c', 28, () => tmp.b.c),
		d_one = $.prop($$props, 'd_one', 28, () => $.get($$array)[0]),
		d_three = $.prop($$props, 'd_three', 28, () => $.get($$array_2)[0]),
		length = $.prop($$props, 'length', 28, () => $.get($$array_2).slice(1).length),
		f = $.prop($$props, 'f', 28, () => tmp.b.f),
		e_one = $.prop($$props, 'e_one', 28, () => $.get($$array_3)[0]),
		g = $.prop($$props, 'g', 28, () => $.fallback(tmp.g, default_g));

	const { a: A, b: { c: C } } = THING;

	var $$exports = {
		A,
		C,
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

		get d_one() {
			return d_one();
		},

		set d_one($$value) {
			d_one($$value);
			$.flush();
		},

		get d_three() {
			return d_three();
		},

		set d_three($$value) {
			d_three($$value);
			$.flush();
		},

		get length() {
			return length();
		},

		set length($$value) {
			length($$value);
			$.flush();
		},

		get f() {
			return f();
		},

		set f($$value) {
			f($$value);
			$.flush();
		},

		get e_one() {
			return e_one();
		},

		set e_one($$value) {
			e_one($$value);
			$.flush();
		},

		get g() {
			return g();
		},

		set g($$value) {
			g($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div);

	$.reset(div);

	var div_1 = $.sibling(div, 2);
	var text_1 = $.child(div_1, true);

	$.reset(div_1);

	$.template_effect(
		($0) => {
			$.set_text(text, `a: ${a() ?? ''},
b: ${typeof b},
c: ${c() ?? ''},
d_one: ${d_one() ?? ''},
d_three: ${$d_three() ?? ''},
length: ${length() ?? ''},
f: ${f() ?? ''},
g: ${g() ?? ''},
e: ${typeof e},
e_one: ${e_one() ?? ''},
A: ${A ?? ''},
C: ${C ?? ''}`);

			$.set_text(text_1, $0);
		},
		[() => ($.untrack(() => JSON.stringify(THING)))]
	);

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'A', A);
	$.bind_prop($$props, 'C', C);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}