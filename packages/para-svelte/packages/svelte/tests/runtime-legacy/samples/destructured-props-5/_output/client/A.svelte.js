import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from "svelte/store";

var root = $.from_html(`<div> </div> <div> </div>`, 1);

export default function A($$anchor, $$props) {
	$.push($$props, false);

	const $q = () => $.store_get(q(), '$q', $$stores);
	const $r = () => $.store_get(r(), '$r', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let default_b = 5;
	const LIST = [1, 2, 3, { a: 4 }, [5, writable(6), writable(7), 8]];

	const [
		x,,
		...[
			,
			{ a: list_two_a, b: list_two_b = default_b },
			[, ...{ length: y }]
		]
	] = LIST;

	let tmp = LIST,
		$$array = $.derived(() => $.to_array(tmp)),
		$$array_1 = $.derived(() => $.to_array($.get($$array).slice(3), 2)),
		$$array_2 = $.derived(() => $.to_array($.get($$array_1)[1])),
		$$array_3 = $.derived(() => $.to_array($.get($$array_2).slice(2))),
		l = $.prop($$props, 'l', 28, () => $.get($$array)[0]),
		m = $.prop($$props, 'm', 28, () => $.get($$array)[1]),
		n = $.prop($$props, 'n', 28, () => $.get($$array_1)[0].a),
		o = $.prop($$props, 'o', 28, () => $.fallback($.get($$array_1)[0].b, default_b)),
		p = $.prop($$props, 'p', 28, () => $.get($$array_2)[0]),
		q = $.prop($$props, 'q', 28, () => $.get($$array_2)[1]),
		r = $.prop($$props, 'r', 28, () => $.get($$array_3)[0]),
		s = $.prop($$props, 's', 28, () => $.get($$array_3).slice(1).length);

	var $$exports = {
		x,
		list_two_a,
		list_two_b,
		y,
		get l() {
			return l();
		},

		set l($$value) {
			l($$value);
			$.flush();
		},

		get m() {
			return m();
		},

		set m($$value) {
			m($$value);
			$.flush();
		},

		get n() {
			return n();
		},

		set n($$value) {
			n($$value);
			$.flush();
		},

		get o() {
			return o();
		},

		set o($$value) {
			o($$value);
			$.flush();
		},

		get p() {
			return p();
		},

		set p($$value) {
			p($$value);
			$.flush();
		},

		get q() {
			return q();
		},

		set q($$value) {
			q($$value);
			$.flush();
		},

		get r() {
			return r();
		},

		set r($$value) {
			r($$value);
			$.flush();
		},

		get s() {
			return s();
		},

		set s($$value) {
			s($$value);
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
			$.set_text(text, `x: ${x ?? ''}, list_two_a: ${list_two_a ?? ''}, list_two_b: ${list_two_b ?? ''}, y: ${y ?? ''}, l: ${l() ?? ''}, m: ${m() ?? ''},
	n: ${n() ?? ''}, o: ${o() ?? ''}, p: ${p() ?? ''}, q: ${$q() ?? ''}, r: ${$r() ?? ''}, s: ${s() ?? ''}`);

			$.set_text(text_1, $0);
		},
		[() => ($.untrack(() => JSON.stringify(LIST)))]
	);

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'x', x);
	$.bind_prop($$props, 'list_two_a', list_two_a);
	$.bind_prop($$props, 'list_two_b', list_two_b);
	$.bind_prop($$props, 'y', y);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}