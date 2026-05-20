import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div><input type="checkbox"/> <input type="text"/></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let todos = $.prop($$props, 'todos', 12);

	var $$exports = {
		get todos() {
			return todos();
		},

		set todos($$value) {
			todos($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(
		node,
		1,
		() => (
			$.deep_read_state(todos()),
			$.untrack(() => Object.keys(todos()))
		),
		$.index,
		($$anchor, key) => {
			var div = root_1();
			var input = $.child(div);

			$.remove_input_defaults(input);

			var input_1 = $.sibling(input, 2);

			$.remove_input_defaults(input_1);
			$.reset(div);

			$.template_effect(() => $.set_class(div, 1, `todo ${(
				$.deep_read_state(todos()),
				$.get(key),
				$.untrack(() => todos()[$.get(key)].done ? "done" : "")
			) ?? ''}`));

			$.bind_checked(input, () => todos()[$.get(key)].done, ($$value) => todos(todos()[$.get(key)].done = $$value, true));
			$.bind_value(input_1, () => todos()[$.get(key)].description, ($$value) => todos(todos()[$.get(key)].description = $$value, true));
			$.append($$anchor, div);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}