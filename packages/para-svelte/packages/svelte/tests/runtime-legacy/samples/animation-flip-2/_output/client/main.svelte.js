import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { flip } from 'svelte/animate';

var root_1 = $.from_html(`<label><input type="checkbox"/> </label>`);
var root = $.from_html(`<button>Remove last</button> <div class="list"></div>`, 1);

export default function Main($$anchor) {
	let todos = $.mutable_source([
		{ id: 1, done: false, description: 'write some docs' },
		{ id: 2, done: false, description: 'start writing JSConf talk' },
		{ id: 3, done: true, description: 'buy some milk' },
		{ id: 4, done: false, description: 'mow the lawn' },
		{ id: 5, done: false, description: 'feed the turtle' },
		{ id: 6, done: false, description: 'fix some bugs' }
	]);

	function update() {
		$.set(todos, [...$.get(todos)]);
		$.get(todos).pop();
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var div = $.sibling(button, 2);

	$.each(div, 13, () => $.get(todos), (todo) => todo.id, ($$anchor, todo, $$index) => {
		var label = root_1();
		var input = $.child(label);

		$.remove_input_defaults(input);

		var text = $.sibling(input);

		$.reset(label);
		$.template_effect(() => $.set_text(text, ` ${($.get(todo), $.untrack(() => $.get(todo).description)) ?? ''}`));

		$.bind_checked(input, () => $.get(todo).done, ($$value) => (
			$.get(todo).done = $$value,
			$.invalidate_inner_signals(() => ($.get(todos)))
		));

		$.animation(label, () => flip, null);
		$.append($$anchor, label);
	});

	$.reset(div);
	$.event('click', button, update);
	$.append($$anchor, fragment);
}