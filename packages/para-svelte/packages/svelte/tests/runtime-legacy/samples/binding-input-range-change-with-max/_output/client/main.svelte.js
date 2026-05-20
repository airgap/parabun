import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button></button> <input type="range" min="0"/> <p> </p>`, 1);

export default function Main($$anchor) {
	let value = $.mutable_source(10);
	let max = $.mutable_source(10);

	function change() {
		$.set(value, 20);
		$.set(max, 20);
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var input = $.sibling(button, 2);

	$.remove_input_defaults(input);

	var p = $.sibling(input, 2);
	var text = $.child(p);

	$.reset(p);

	$.template_effect(() => {
		$.set_attribute(input, 'max', $.get(max));
		$.set_text(text, `${$.get(value) ?? ''} of ${$.get(max) ?? ''}`);
	});

	$.event('click', button, change);
	$.bind_value(input, () => $.get(value), ($$value) => $.set(value, $$value));
	$.append($$anchor, fragment);
}