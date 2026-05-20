import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<label><input type="checkbox"/> </label>`);
var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];
	let options = [1, 2, 3];
	let selected = $.prop($$props, 'selected', 28, () => [[1, 2, 3]]);

	var $$exports = {
		get selected() {
			return selected();
		},

		set selected($$value) {
			selected($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, () => options, $.index, ($$anchor, value) => {
		var label = root_1();
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
			[],
			input,
			() => {
				$.get(value);

				return selected()[0];
			},
			($$value) => selected(selected()[0] = $$value, true)
		);

		$.append($$anchor, label);
	});

	var p = $.sibling(node, 2);
	var text_1 = $.child(p, true);

	$.reset(p);

	$.template_effect(($0) => $.set_text(text_1, $0), [
		() => (
			$.deep_read_state(selected()),
			$.untrack(() => selected()[0].join(', '))
		)
	]);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}