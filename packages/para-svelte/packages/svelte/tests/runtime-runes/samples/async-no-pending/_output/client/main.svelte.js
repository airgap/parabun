import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(($0) => $.set_text(text, $0), void 0, [() => Promise.resolve('hello')]);
	$.append($$anchor, p);
}