import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(` <input/>`, 1);

export default function Main($$anchor) {
	let a = $.mutable_source([{ a: 'Hello' }]);
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(a), $.index, ($$anchor, $$item, $$index, $$array) => {
		let a = () => $.get($$item).a;

		$.next();

		var fragment_1 = root_1();
		var text = $.first_child(fragment_1);
		var input = $.sibling(text);

		$.remove_input_defaults(input);
		$.template_effect(() => $.set_text(text, `${a() ?? ''} `));

		$.bind_value(input, a, ($$value) => (
			$.get($$item).a = $$value,
			$.invalidate_inner_signals(() => ($$array()))
		));

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);
}