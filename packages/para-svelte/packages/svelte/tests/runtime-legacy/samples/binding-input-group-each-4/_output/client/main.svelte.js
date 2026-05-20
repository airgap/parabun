import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<label><input type="checkbox"/> </label>`);
var root_1 = $.from_html(`<!> <p> </p>`, 1);
var root_4 = $.from_html(`<label><input type="checkbox"/> </label>`);
var root_3 = $.from_html(`<!> <p> </p>`, 1);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];
	const binding_group_1 = [];
	const options = [1, 2, 3];
	let selected_array_1 = $.prop($$props, 'selected_array_1', 28, () => [[1], [2]]);
	let selected_array_2 = $.prop($$props, 'selected_array_2', 28, () => [[], [3]]);

	var $$exports = {
		get selected_array_1() {
			return selected_array_1();
		},

		set selected_array_1($$value) {
			selected_array_1($$value);
			$.flush();
		},

		get selected_array_2() {
			return selected_array_2();
		},

		set selected_array_2($$value) {
			selected_array_2($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, selected_array_1, $.index, ($$anchor, selected, $$index_1) => {
		var fragment_1 = root_1();
		var node_1 = $.first_child(fragment_1);

		$.each(node_1, 1, () => options, $.index, ($$anchor, value) => {
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

					return selected_array_1()[$$index_1];
				},
				($$value) => (
					selected_array_1()[$$index_1] = $$value,
					$.invalidate_inner_signals(() => (selected_array_1()))
				)
			);

			$.append($$anchor, label);
		});

		var p = $.sibling(node_1, 2);
		var text_1 = $.child(p, true);

		$.reset(p);

		$.template_effect(($0) => $.set_text(text_1, $0), [
			() => (
				selected_array_1()[$$index_1],
				$.untrack(() => selected_array_1()[$$index_1].join(', '))
			)
		]);

		$.append($$anchor, fragment_1);
	});

	var node_2 = $.sibling(node, 2);

	$.each(node_2, 1, selected_array_2, $.index, ($$anchor, selected, $$index_3) => {
		var fragment_2 = root_3();
		var node_3 = $.first_child(fragment_2);

		$.each(node_3, 1, () => options, $.index, ($$anchor, value) => {
			var label_1 = root_4();
			var input_1 = $.child(label_1);

			$.remove_input_defaults(input_1);

			var input_1_value;
			var text_2 = $.sibling(input_1);

			$.reset(label_1);

			$.template_effect(() => {
				if (input_1_value !== (input_1_value = $.get(value))) {
					input_1.value = (input_1.__value = $.get(value)) ?? '';
				}

				$.set_text(text_2, ` ${$.get(value) ?? ''}`);
			});

			$.bind_group(
				binding_group_1,
				[$$index_3],
				input_1,
				() => {
					$.get(value);

					return selected_array_2()[$$index_3];
				},
				($$value) => (
					selected_array_2()[$$index_3] = $$value,
					$.invalidate_inner_signals(() => (selected_array_2()))
				)
			);

			$.append($$anchor, label_1);
		});

		var p_1 = $.sibling(node_3, 2);
		var text_3 = $.child(p_1, true);

		$.reset(p_1);

		$.template_effect(($0) => $.set_text(text_3, $0), [
			() => (
				selected_array_2()[$$index_3],
				$.untrack(() => selected_array_2()[$$index_3].join(', '))
			)
		]);

		$.append($$anchor, fragment_2);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}