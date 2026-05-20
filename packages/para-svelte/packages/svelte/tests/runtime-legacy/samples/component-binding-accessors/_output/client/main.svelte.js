import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root = $.from_html(`<!> <input/> <button>Reset</button>`, 1);

export default function Main($$anchor) {
	let value = $.mutable_source('something');
	let c = $.mutable_source();
	var fragment = root();
	var node = $.first_child(fragment);

	$.bind_this(
		Nested(node, {
			get value() {
				return $.get(value);
			},

			set value($$value) {
				$.set(value, $$value);
			},
			$$legacy: true
		}),
		($$value) => $.set(c, $$value),
		() => $.get(c)
	);

	var input = $.sibling(node, 2);

	$.remove_input_defaults(input);

	var button = $.sibling(input, 2);

	$.bind_value(input, () => $.get(value), ($$value) => $.set(value, $$value));

	$.event('click', button, () => {
		$.mutate(c, $.get(c).value = 'Reset');
	});

	$.append($$anchor, fragment);
}