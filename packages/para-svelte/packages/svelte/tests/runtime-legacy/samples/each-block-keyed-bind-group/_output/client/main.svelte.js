import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<label><input type="checkbox"/> </label>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];
	let flavours = $.mutable_source(['Vanilla', 'Strawberry', 'Chocolate', 'Lemon', 'Coconut']);
	let choices = $.mutable_source([]);

	$.legacy_pre_effect(() => ($.get(flavours), $.get(choices)), () => {
		$.set(flavours, $.get(flavours).sort((a, b) => $.get(choices).includes(b) - $.get(choices).includes(a)));
	});

	$.legacy_pre_effect_reset();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(flavours), (flavour) => flavour, ($$anchor, flavour) => {
		var label = root_1();
		var input = $.child(label);

		$.remove_input_defaults(input);

		var input_value;
		var text = $.sibling(input);

		$.reset(label);

		$.template_effect(() => {
			if (input_value !== (input_value = $.get(flavour))) {
				input.value = (input.__value = $.get(flavour)) ?? '';
			}

			$.set_text(text, ` ${$.get(flavour) ?? ''}`);
		});

		$.bind_group(
			binding_group,
			[],
			input,
			() => {
				$.get(flavour);

				return $.get(choices);
			},
			($$value) => $.set(choices, $$value)
		);

		$.append($$anchor, label);
	});

	$.append($$anchor, fragment);
	$.pop();
}