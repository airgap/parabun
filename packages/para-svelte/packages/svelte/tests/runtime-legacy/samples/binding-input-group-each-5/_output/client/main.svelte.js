import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_3 = $.from_html(`<label><input type="checkbox"/> </label>`);
var root_2 = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];
	const options = [1, 2, 3];
	let selected_array = $.prop($$props, 'selected_array', 28, () => [[[1], [1, 2, 3]], [[2], [1]]]);
	let selected_index = $.prop($$props, 'selected_index', 28, () => [0, 1]);

	var $$exports = {
		get selected_array() {
			return selected_array();
		},

		set selected_array($$value) {
			selected_array($$value);
			$.flush();
		},

		get selected_index() {
			return selected_index();
		},

		set selected_index($$value) {
			selected_index($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, selected_array, $.index, ($$anchor, selected, $$index_2) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		$.each(node_1, 1, selected_index, $.index, ($$anchor, index, $$index_1) => {
			var fragment_2 = root_2();
			var node_2 = $.first_child(fragment_2);

			$.each(node_2, 1, () => options, $.index, ($$anchor, value) => {
				var label = root_3();
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
					[$$index_1, $$index_2],
					input,
					() => {
						$.get(value);

						return $.get(selected)[$.get(index)];
					},
					($$value) => (
						$.get(selected)[$.get(index)] = $$value,
						$.invalidate_inner_signals(() => (selected_array()))
					)
				);

				$.append($$anchor, label);
			});

			var p = $.sibling(node_2, 2);
			var text_1 = $.child(p, true);

			$.reset(p);

			$.template_effect(($0) => $.set_text(text_1, $0), [
				() => (
					$.get(selected),
					$.get(index),
					$.untrack(() => $.get(selected)[$.get(index)].join(', '))
				)
			]);

			$.append($$anchor, fragment_2);
		});

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}