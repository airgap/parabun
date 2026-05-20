import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { hasContext } from 'svelte';

var root = $.from_html(`<div> </div>`);

export default function Leaf($$anchor, $$props) {
	$.push($$props, false);

	const has = hasContext('test');

	$.init();

	var div = root();
	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text, has));
	$.append($$anchor, div);
	$.pop();
}