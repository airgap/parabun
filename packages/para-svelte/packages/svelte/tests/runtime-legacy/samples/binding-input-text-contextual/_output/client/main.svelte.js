import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div><input/><p> </p></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 12);

	var $$exports = {
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, items, $.index, ($$anchor, item, $$index) => {
		var div = root_1();
		var input = $.child(div);

		$.remove_input_defaults(input);

		var p = $.sibling(input);
		var text = $.child(p, true);

		$.reset(p);
		$.reset(div);
		$.template_effect(() => $.set_text(text, items()[$$index]));

		$.bind_value(input, () => items()[$$index], ($$value) => (
			items()[$$index] = $$value,
			$.invalidate_inner_signals(() => (items()))
		));

		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}