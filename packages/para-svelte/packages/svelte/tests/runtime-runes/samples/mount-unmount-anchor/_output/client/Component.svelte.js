import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Component($$anchor, $$props) {
	let text = $.prop($$props, 'text', 3, 'hello');
	var p = root();
	var text_1 = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text_1, text()));
	$.append($$anchor, p);
}