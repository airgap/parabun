import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Inner from "./Inner.svelte";

var root = $.from_html(`<input/> <!>`, 1);

export default function Main($$anchor) {
	let value = $.mutable_source('');
	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var node = $.sibling(input, 2);

	Inner(node, {
		get value() {
			return $.get(value);
		}
	});

	$.bind_value(input, () => $.get(value), ($$value) => $.set(value, $$value));
	$.append($$anchor, fragment);
}