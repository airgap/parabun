import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { setContext } from 'svelte';

var root = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const a = {};
	const b = setContext('foo', a);

	$.init();

	var div = root();
	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text, a === b));
	$.append($$anchor, div);
	$.pop();
}