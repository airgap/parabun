import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<input/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12, '');

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	Nested($$anchor, {
		class: 'foo',
		children: ($$anchor, $$slotProps) => {
			var input = root_1();

			$.remove_input_defaults(input);
			$.bind_value(input, value);
			$.append($$anchor, input);
		},
		$$slots: { default: true }
	});

	return $.pop($$exports);
}