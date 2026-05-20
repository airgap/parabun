import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Counter($$anchor, $$props) {
	$.push($$props, true);

	let count = $.prop($$props, 'count', 15);
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, count()));
	$.event('click', button, () => $.update_prop(count));
	$.append($$anchor, button);
	$.pop();
}