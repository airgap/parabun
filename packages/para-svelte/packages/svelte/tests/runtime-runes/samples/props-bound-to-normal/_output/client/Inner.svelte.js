import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Inner($$anchor, $$props) {
	$.push($$props, true);

	let bar = $.prop($$props, 'bar', 15);
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, bar()));
	$.event('click', button, () => $.update_prop(bar, -1));
	$.append($$anchor, button);
	$.pop();
}