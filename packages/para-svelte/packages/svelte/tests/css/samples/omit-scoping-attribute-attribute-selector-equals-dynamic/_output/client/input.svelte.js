import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><p class="svelte-xyz">this is styled</p> <p data-foo="baz">this is unstyled</p></div>`);

export default function Input($$anchor, $$props) {
	let dynamic = $.prop($$props, 'dynamic', 8);
	var div = root();
	var p = $.child(div);

	$.next(2);
	$.reset(div);
	$.template_effect(() => $.set_attribute(p, 'data-foo', dynamic()));
	$.append($$anchor, div);
}