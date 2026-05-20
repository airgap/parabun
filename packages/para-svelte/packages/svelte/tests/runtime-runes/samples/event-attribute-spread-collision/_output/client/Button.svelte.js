import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button><!></button>`);

export default function Button($$anchor, $$props) {
	const props = $.rest_props($$props, ['$$slots', '$$events', '$$legacy', 'children']);
	var button = root();

	$.attribute_effect(button, () => ({ ...props }));

	var node = $.child(button);

	$.snippet(node, () => $$props.children);
	$.reset(button);

	$.event('click', button, function ($$arg) {
		$.bubble_event.call(this, $$props, $$arg);
	});

	$.append($$anchor, button);
}