import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<label><input type="checkbox"/> </label> <label><input type="checkbox"/> </label> <label><input type="checkbox"/> </label> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];
	let selected = $.prop($$props, 'selected', 12);
	let values = $.prop($$props, 'values', 12);

	var $$exports = {
		get selected() {
			return selected();
		},

		set selected($$value) {
			selected($$value);
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

	var fragment = root();
	var label = $.first_child(fragment);
	var input = $.child(label);

	$.remove_input_defaults(input);

	var input_value;
	var text = $.sibling(input);

	$.reset(label);

	var label_1 = $.sibling(label, 2);
	var input_1 = $.child(label_1);

	$.remove_input_defaults(input_1);

	var input_1_value;
	var text_1 = $.sibling(input_1);

	$.reset(label_1);

	var label_2 = $.sibling(label_1, 2);
	var input_2 = $.child(label_2);

	$.remove_input_defaults(input_2);

	var input_2_value;
	var text_2 = $.sibling(input_2);

	$.reset(label_2);

	var p = $.sibling(label_2, 2);
	var text_3 = $.child(p, true);

	$.reset(p);

	$.template_effect(
		($0) => {
			if (input_value !== (input_value = ($.deep_read_state(values()), $.untrack(() => values()[0])))) {
				input.value = (input.__value = ($.deep_read_state(values()), $.untrack(() => values()[0]))) ?? '';
			}

			$.set_text(text, ` ${(
				$.deep_read_state(values()),
				$.untrack(() => values()[0].name)
			) ?? ''}`);

			if (input_1_value !== (input_1_value = ($.deep_read_state(values()), $.untrack(() => values()[1])))) {
				input_1.value = (input_1.__value = ($.deep_read_state(values()), $.untrack(() => values()[1]))) ?? '';
			}

			$.set_text(text_1, ` ${(
				$.deep_read_state(values()),
				$.untrack(() => values()[1].name)
			) ?? ''}`);

			if (input_2_value !== (input_2_value = ($.deep_read_state(values()), $.untrack(() => values()[2])))) {
				input_2.value = (input_2.__value = ($.deep_read_state(values()), $.untrack(() => values()[2]))) ?? '';
			}

			$.set_text(text_2, ` ${(
				$.deep_read_state(values()),
				$.untrack(() => values()[2].name)
			) ?? ''}`);

			$.set_text(text_3, $0);
		},
		[
			() => (
				$.deep_read_state(selected()),
				$.untrack(() => selected().map(function (value) {
					return value.name;
				}).join(', '))
			)
		]
	);

	$.bind_group(
		binding_group,
		[],
		input,
		() => {
			($.deep_read_state(values()), $.untrack(() => values()[0]));

			return selected();
		},
		selected
	);

	$.bind_group(
		binding_group,
		[],
		input_1,
		() => {
			($.deep_read_state(values()), $.untrack(() => values()[1]));

			return selected();
		},
		selected
	);

	$.bind_group(
		binding_group,
		[],
		input_2,
		() => {
			($.deep_read_state(values()), $.untrack(() => values()[2]));

			return selected();
		},
		selected
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}