import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Child($$anchor, $$props) {
	let props = $.rest_props($$props, ['$$slots', '$$events', '$$legacy']);
	var div = root();

	$.attribute_effect(div, () => ({ ...props }));
	$.append($$anchor, div);
}