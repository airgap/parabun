import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Child($$anchor) {
	var n;
	var $$promises = $.run([async () => n = await $.async_derived(() => 1)]);
	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $.get(n)), void 0, void 0, [$$promises[0]]);
	$.append($$anchor, p);
}