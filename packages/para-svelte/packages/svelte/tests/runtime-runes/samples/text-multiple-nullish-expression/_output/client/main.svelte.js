import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<li> </li>`);

export default function Main($$anchor) {
	function fn() {}

	var li = root();
	var text = $.child(li);

	$.reset(li);
	$.template_effect(($0, $1) => $.set_text(text, `${$0 ?? ''}${$1 ?? ''}`), [() => fn(), () => null && fn()]);
	$.append($$anchor, li);
}