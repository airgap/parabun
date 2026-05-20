import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input type="radio" name="current"/> <input type="text"/> <input type="text"/>`, 1);

export default function Main($$anchor) {
	const binding_group = [];
	let name = $.mutable_source('world');
	let current = $.mutable_source('');
	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var input_value;
	var input_1 = $.sibling(input, 2);

	$.remove_input_defaults(input_1);

	var input_2 = $.sibling(input_1, 2);

	$.remove_input_defaults(input_2);

	$.template_effect(() => {
		if (input_value !== (input_value = $.get(name))) {
			input.value = (input.__value = $.get(name)) ?? '';
		}
	});

	$.bind_group(
		binding_group,
		[],
		input,
		() => {
			$.get(name);

			return $.get(current);
		},
		($$value) => $.set(current, $$value)
	);

	$.bind_value(input_1, () => $.get(current), ($$value) => $.set(current, $$value));
	$.bind_value(input_2, () => $.get(name), ($$value) => $.set(name, $$value));
	$.append($$anchor, fragment);
}