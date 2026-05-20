import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	var message;
	var $$promises = $.run([() => 0, () => message = $.derived(() => 'hello')]);
	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $.get(message)), void 0, void 0, [$$promises[1]]);
	$.append($$anchor, p);
}