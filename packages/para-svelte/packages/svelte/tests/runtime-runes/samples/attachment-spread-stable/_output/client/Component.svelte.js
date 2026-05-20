import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p>hello</p>`);

export default function Component($$anchor, $$props) {
	let props = $.rest_props($$props, ['$$slots', '$$events', '$$legacy']);
	var p = root();

	$.attribute_effect(p, () => ({ ...props }));
	$.append($$anchor, p);
}