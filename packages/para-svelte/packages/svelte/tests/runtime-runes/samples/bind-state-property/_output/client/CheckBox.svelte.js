import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/>`);

export default function CheckBox($$anchor, $$props) {
	$.push($$props, true);

	let checked = $.prop($$props, 'checked', 15),
		rest = $.rest_props($$props, ['$$slots', '$$events', '$$legacy', 'checked']);

	var input = root();

	$.attribute_effect(input, () => ({ type: 'checkbox', ...rest }), void 0, void 0, void 0, void 0, true);
	$.bind_checked(input, checked);
	$.append($$anchor, input);
	$.pop();
}