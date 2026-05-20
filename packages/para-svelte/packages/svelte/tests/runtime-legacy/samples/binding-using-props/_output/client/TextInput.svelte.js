import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/>`);

export default function TextInput($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);

	$.push($$props, false);

	let actualValue = $.prop($$props, 'actualValue', 12);
	let x = $$sanitized_props;

	var $$exports = {
		get actualValue() {
			return actualValue();
		},

		set actualValue($$value) {
			actualValue($$value);
			$.flush();
		}
	};

	var input = root();

	$.remove_input_defaults(input);
	$.bind_value(input, actualValue);
	$.append($$anchor, input);

	return $.pop($$exports);
}