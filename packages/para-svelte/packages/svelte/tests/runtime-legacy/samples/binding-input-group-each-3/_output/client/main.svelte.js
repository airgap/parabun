import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<label><input type="checkbox"/> </label>`);
var root_1 = $.from_html(`<div><!> <p> </p></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];
	let selected_array = $.prop($$props, 'selected_array', 12);
	let values = $.prop($$props, 'values', 12);

	var $$exports = {
		get selected_array() {
			return selected_array();
		},

		set selected_array($$value) {
			selected_array($$value);
			$.flush();
		},

		get values() {
			return values();
		},

		set values($$value) {
			values($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, selected_array, $.index, ($$anchor, _, $$index_1) => {
		let index = $$index_1;
		var div = root_1();
		var node_1 = $.child(div);

		$.each(node_1, 1, values, $.index, ($$anchor, value) => {
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

				$.set_text(text, ` ${($.get(value), $.untrack(() => $.get(value).name)) ?? ''}`);
			});

			$.bind_group(
				binding_group,
				[$$index_1],
				input,
				() => {
					$.get(value);

					return selected_array()[index];
				},
				($$value) => selected_array(selected_array()[index] = $$value, true)
			);

			$.append($$anchor, label);
		});

		var p = $.sibling(node_1, 2);
		var text_1 = $.child(p, true);

		$.reset(p);
		$.reset(div);

		$.template_effect(($0) => $.set_text(text_1, $0), [
			() => (
				$.deep_read_state(selected_array()),
				index,
				$.untrack(() => selected_array()[index].map((v) => v.name).join(', '))
			)
		]);

		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}