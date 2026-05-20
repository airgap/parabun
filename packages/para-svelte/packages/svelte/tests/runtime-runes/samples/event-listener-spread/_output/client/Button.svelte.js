import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button><!></button>`);

export default function Button($$anchor, $$props) {
	let stuff = $.rest_props($$props, ['$$slots', '$$events', '$$legacy']);
	var button = root();

	$.attribute_effect(button, () => ({ ...stuff }));

	var node = $.child(button);

	$.slot(node, $$props, 'default', {}, null);
	$.reset(button);

	$.event('click', button, function ($$arg) {
		$.bubble_event.call(this, $$props, $$arg);
	});

	$.append($$anchor, button);
}