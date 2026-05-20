import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<input type="text"/>`);

export default function Main($$anchor) {
	let data = $.mutable_source({ a: { value: '' } });
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => ($.get(data), $.untrack(() => Object.values($.get(data)))), $.index, ($$anchor, object, $$index) => {
		var input = root_1();

		$.remove_input_defaults(input);

		$.bind_value(input, () => $.get(object).value, ($$value) => (
			$.get(object).value = $$value,
			$.invalidate_inner_signals(() => ($.get(data)))
		));

		$.append($$anchor, input);
	});

	$.append($$anchor, fragment);
}