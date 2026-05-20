import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let inputType = $.prop($$props, 'inputType', 12);
	let inputValue = $.prop($$props, 'inputValue', 12);

	var $$exports = {
		get inputType() {
			return inputType();
		},

		set inputType($$value) {
			inputType($$value);
			$.flush();
		},

		get inputValue() {
			return inputValue();
		},

		set inputValue($$value) {
			inputValue($$value);
			$.flush();
		}
	};

	var input = root();

	$.remove_input_defaults(input);

	$.template_effect(() => {
		$.set_attribute(input, 'type', inputType());
		$.set_value(input, inputValue());
	});

	$.append($$anchor, input);

	return $.pop($$exports);
}