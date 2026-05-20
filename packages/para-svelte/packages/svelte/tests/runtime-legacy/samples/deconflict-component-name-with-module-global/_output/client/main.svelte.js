import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

let set = new Set(['x']);
var root = $.from_html(`<p> </p>`);

export default function Set_1($$anchor, $$props) {
	$.push($$props, false);
	$.init();

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(($0) => $.set_text(text, $0), [() => ($.untrack(() => set.has('x')))]);
	$.append($$anchor, p);
	$.pop();
}