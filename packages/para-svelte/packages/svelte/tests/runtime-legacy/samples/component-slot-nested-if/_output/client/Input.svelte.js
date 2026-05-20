import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/> <!>`, 1);

export default function Input($$anchor, $$props) {
	let val = $.mutable_source();
	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var node = $.sibling(input, 2);

	$.slot(
		node,
		$$props,
		'default',
		{
			get val() {
				return $.get(val);
			}
		},
		null
	);

	$.bind_value(input, () => $.get(val), ($$value) => $.set(val, $$value));
	$.append($$anchor, fragment);
}