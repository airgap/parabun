import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span> </span>`);

export default function Counter($$anchor, $$props) {
	$.push($$props, true);

	let count = $.prop($$props, 'count', 11, 0);
	var span = root();
	var text = $.child(span, true);

	$.reset(span);
	$.template_effect(() => $.set_text(text, count()));
	$.append($$anchor, span);
	$.pop();
}