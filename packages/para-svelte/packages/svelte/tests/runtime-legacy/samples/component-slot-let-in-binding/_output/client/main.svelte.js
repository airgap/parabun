import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<label> <input/></label>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let letters = $.prop($$props, 'letters', 28, () => ['a', 'b', 'c']);

	var $$exports = {
		get letters() {
			return letters();
		},

		set letters($$value) {
			letters($$value);
			$.flush();
		}
	};

	$.init();

	Nested($$anchor, {
		get items() {
			return letters();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const index = $.derived_safe_equal(() => $$slotProps.index);
				var label = root_1();
				var text = $.child(label);
				var input = $.sibling(text);

				$.remove_input_defaults(input);
				$.reset(label);
				$.template_effect(() => $.set_text(text, `${$.get(index) + 1}: `));
				$.bind_value(input, () => letters()[$.get(index)], ($$value) => letters(letters()[$.get(index)] = $$value, true));
				$.append($$anchor, label);
			}
		}
	});

	return $.pop($$exports);
}