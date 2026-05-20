import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div>`);

export default function Main($$anchor) {
	const props = {};
	let changed = $.state('');
	var div = root();
	var event_handler = () => $.set(changed, 'a');
	var event_handler_1 = () => $.set(changed, 'b');

	$.attribute_effect(div, () => ({ ...props, ona: event_handler, onb: event_handler_1 }));

	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text, $.get(changed)));
	$.append($$anchor, div);
}