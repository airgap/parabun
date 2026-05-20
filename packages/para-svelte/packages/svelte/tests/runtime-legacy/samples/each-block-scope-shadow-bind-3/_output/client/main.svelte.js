import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> <input/> <input/></div>`);

export default function Main($$anchor) {
	let a = $.mutable_source([['Hello', 'World'], ['Sapper', 'App']]);
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(a), $.index, ($$anchor, a, $$index, $$array) => {
		var div = root_1();
		var text = $.child(div);
		var input = $.sibling(text);

		$.remove_input_defaults(input);

		var input_1 = $.sibling(input, 2);

		$.remove_input_defaults(input_1);
		$.reset(div);
		$.template_effect(() => $.set_text(text, `${($.get(a), $.untrack(() => $.get(a)[0])) ?? ''} ${($.get(a), $.untrack(() => $.get(a)[1])) ?? ''} `));

		$.bind_value(input, () => $.get(a)[0], ($$value) => (
			$.get(a)[0] = $$value,
			$.invalidate_inner_signals(() => ($$array()))
		));

		$.bind_value(input_1, () => $.get(a)[1], ($$value) => (
			$.get(a)[1] = $$value,
			$.invalidate_inner_signals(() => ($$array()))
		));

		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);
}