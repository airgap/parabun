import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span> </span>`);

export default function Content($$anchor, $$props) {
	var span = root();
	var text_1 = $.child(span, true);

	$.reset(span);
	$.template_effect(() => $.set_text(text_1, $$props.text));
	$.append($$anchor, span);
}