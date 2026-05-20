import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input type="text"/>`);

export default function Field($$anchor, $$props) {
	let value = $.prop($$props, 'value', 12);
	var input = root();

	$.remove_input_defaults(input);
	$.bind_value(input, value);
	$.append($$anchor, input);
}