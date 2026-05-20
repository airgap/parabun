import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div><input type="checkbox"/> <p> </p></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let todos = $.mutable_source([
		{ done: false, text: 'one' },
		{ done: false, text: 'two' },
		{ done: false, text: 'three' }
	]);

	function clear() {
		$.set(todos, $.get(todos).filter((t) => !t.done));
	}

	var $$exports = { clear };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(todos), $.index, ($$anchor, todo, i) => {
		var div = root_1();
		var input = $.child(div);

		$.remove_input_defaults(input);

		var p = $.sibling(input, 2);
		var text = $.child(p, true);

		$.reset(p);
		$.reset(div);
		$.template_effect(() => $.set_text(text, ($.get(todo), $.untrack(() => $.get(todo).text))));

		$.bind_checked(input, () => $.get(todo).done, ($$value) => (
			$.get(todo).done = $$value,
			$.invalidate_inner_signals(() => ($.get(todos)))
		));

		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'clear', clear);

	return $.pop($$exports);
}