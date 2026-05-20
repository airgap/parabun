import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<input type="radio" name="foo"/>`);
var root = $.from_html(`<!> `, 1);

export default function Main($$anchor) {
	const binding_group = [];
	let value = $.state(1);
	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 16, () => [1, 2, 3], $.index, ($$anchor, number) => {
		var input = root_1();

		$.remove_input_defaults(input);

		var input_value;

		$.template_effect(() => {
			if (input_value !== (input_value = number)) {
				input.value = (input.__value = number) ?? '';
			}
		});

		$.bind_group(
			binding_group,
			[],
			input,
			() => {
				number;

				return $.get(value);
			},
			($$value) => $.set(value, $$value)
		);

		$.append($$anchor, input);
	});

	var text = $.sibling(node);

	$.template_effect(() => $.set_text(text, ` ${$.get(value) ?? ''}`));
	$.append($$anchor, fragment);
}