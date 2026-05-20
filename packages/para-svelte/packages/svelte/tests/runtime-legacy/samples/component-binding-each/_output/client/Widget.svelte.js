import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/>`);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12);

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	var input = root();

	$.remove_input_defaults(input);
	$.bind_value(input, value);
	$.append($$anchor, input);

	return $.pop($$exports);
}