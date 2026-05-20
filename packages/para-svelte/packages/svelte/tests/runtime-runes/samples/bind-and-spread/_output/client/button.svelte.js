import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Button($$anchor, $$props) {
	$.push($$props, true);

	let value = $.prop($$props, 'value', 15),
		properties = $.rest_props($$props, ['$$slots', '$$events', '$$legacy', 'value']);

	var button = root();
	var event_handler = () => $.update_prop(value);

	$.attribute_effect(button, () => ({ ...properties, onclick: event_handler }));

	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, value()));
	$.append($$anchor, button);
	$.pop();
}