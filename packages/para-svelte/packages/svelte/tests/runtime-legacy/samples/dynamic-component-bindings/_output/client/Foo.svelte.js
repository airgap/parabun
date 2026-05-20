import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p>foo</p> <input/>`, 1);

export default function Foo($$anchor, $$props) {
	$.push($$props, false);

	let y = $.prop($$props, 'y', 12);

	var $$exports = {
		get y() {
			return y();
		},

		set y($$value) {
			y($$value);
			$.flush();
		}
	};

	var fragment = root();
	var input = $.sibling($.first_child(fragment), 2);

	$.remove_input_defaults(input);
	$.bind_value(input, y);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}