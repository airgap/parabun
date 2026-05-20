import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<div> </div> <div> </div>`, 1);

export default function A($$anchor, $$props) {
	$.push($$props, false);

	const $y = () => $.store_get(y, '$y', $$stores);
	const $q = () => $.store_get(q(), '$q', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let default_b = 5;
	const LIST = [1, { a: 2 }, [3, writable(4)]];
	const [x, { a: list_two_a, b: list_two_b = default_b }, [, y]] = LIST;

	let tmp = LIST,
		$$array = $.derived(() => $.to_array(tmp, 3)),
		$$array_1 = $.derived(() => $.to_array($.get($$array)[2], 2)),
		m = $.prop($$props, 'm', 28, () => $.get($$array)[0]),
		n = $.prop($$props, 'n', 28, () => $.get($$array)[1].a),
		o = $.prop($$props, 'o', 28, () => $.fallback($.get($$array)[1].b, default_b)),
		p = $.prop($$props, 'p', 28, () => $.get($$array_1)[0]),
		q = $.prop($$props, 'q', 28, () => $.get($$array_1)[1]);

	var $$exports = {
		x,
		list_two_a,
		list_two_b,
		y,
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
			$.set_text(text, `x: ${x ?? ''},
  list_two_a: ${list_two_a ?? ''},
  list_two_b: ${list_two_b ?? ''},
  y: ${$y() ?? ''},
  m: ${m() ?? ''},
  n: ${n() ?? ''},
  o: ${o() ?? ''},
  p: ${p() ?? ''},
  q: ${$q() ?? ''}`);

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