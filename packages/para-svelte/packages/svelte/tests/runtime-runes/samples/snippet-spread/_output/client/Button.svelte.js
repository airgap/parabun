import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button><!></button>`);

export default function Button($$anchor, $$props) {
	let props = $.rest_props($$props, ['$$slots', '$$events', '$$legacy']);
	var button = root();

	$.attribute_effect(button, () => ({ ...props }));

	var node = $.child(button);

	$.slot(node, $$props, 'default', {}, null);
	$.reset(button);
	$.append($$anchor, button);
}