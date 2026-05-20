import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<label><input type="checkbox"/> </label>`);
var root_1 = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor) {
	const binding_group = [];
	const values = ['x', 'y', 'z'];
	const list = $.mutable_source({ a: [], b: [], c: [] });
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => ($.get(list), $.untrack(() => Object.keys($.get(list)))), $.index, ($$anchor, key, $$index_1) => {
		var fragment_1 = root_1();
		var node_1 = $.first_child(fragment_1);

		$.each(node_1, 1, () => values, $.index, ($$anchor, value) => {
			var label = root_2();
			var input = $.child(label);

			$.remove_input_defaults(input);

			var input_value;
			var text = $.sibling(input);

			$.reset(label);

			$.template_effect(() => {
				if (input_value !== (input_value = $.get(value))) {
					input.value = (input.__value = $.get(value)) ?? '';
				}

				$.set_text(text, ` ${$.get(value) ?? ''}`);
			});

			$.bind_group(
				binding_group,
				[$$index_1],
				input,
				() => {
					$.get(value);

					return $.get(list)[$.get(key)];
				},
				($$value) => $.mutate(list, $.get(list)[$.get(key)] = $$value)
			);

			$.append($$anchor, label);
		});

		var p = $.sibling(node_1, 2);
		var text_1 = $.child(p, true);

		$.reset(p);

		$.template_effect(($0) => $.set_text(text_1, $0), [
			() => (
				$.get(list),
				$.get(key),
				$.untrack(() => $.get(list)[$.get(key)].join(', '))
			)
		]);

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);
}