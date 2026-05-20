import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div><input/><p> </p></div>`);
var root = $.from_html(`<div><input/><p> </p></div> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);
	let items = $.prop($$props, 'items', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		}
	};

	var fragment = root();
	var div = $.first_child(fragment);
	var input = $.child(div);

	$.remove_input_defaults(input);

	var p = $.sibling(input);
	var text = $.child(p, true);

	$.reset(p);
	$.reset(div);

	var node = $.sibling(div, 2);

	$.each(node, 1, items, $.index, ($$anchor, bar, $$index) => {
		var div_1 = root_1();
		var input_1 = $.child(div_1);

		$.remove_input_defaults(input_1);

		var p_1 = $.sibling(input_1);
		var text_1 = $.child(p_1, true);

		$.reset(p_1);
		$.reset(div_1);
		$.template_effect(() => $.set_text(text_1, items()[$$index]));

		$.bind_value(input_1, () => items()[$$index], ($$value) => (
			items()[$$index] = $$value,
			$.invalidate_inner_signals(() => (items()))
		));

		$.append($$anchor, div_1);
	});

	$.template_effect(() => $.set_text(text, foo()));
	$.bind_value(input, foo);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}