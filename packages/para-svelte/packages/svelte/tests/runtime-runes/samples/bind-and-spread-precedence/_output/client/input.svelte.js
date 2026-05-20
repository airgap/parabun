import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/>`);

export default function Input($$anchor, $$props) {
	$.push($$props, true);

	let value = $.prop($$props, 'value', 15),
		properties = $.rest_props($$props, ['$$slots', '$$events', '$$legacy', 'value']);

	var input = root();

	$.attribute_effect(input, () => ({ ...properties }), void 0, void 0, void 0, void 0, true);
	$.bind_value(input, value);
	$.append($$anchor, input);
	$.pop();
}