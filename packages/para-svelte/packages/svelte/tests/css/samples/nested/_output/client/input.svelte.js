import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span class="foo svelte-xyz"><span class="bar svelte-xyz">text</span></span> <span class="foo svelte-xyz"><span class="bar svelte-xyz"> </span></span>`, 1);

export default function Input($$anchor, $$props) {
	let dynamic = $.prop($$props, 'dynamic', 8);
	var fragment = root();
	var span = $.sibling($.first_child(fragment), 2);
	var span_1 = $.child(span);
	var text = $.child(span_1, true);

	$.reset(span_1);
	$.reset(span);
	$.template_effect(() => $.set_text(text, dynamic()));
	$.append($$anchor, fragment);
}