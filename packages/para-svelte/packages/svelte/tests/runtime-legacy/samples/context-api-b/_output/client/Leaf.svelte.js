import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { getContext } from 'svelte';
import { ID } from './Nested.svelte';

var root = $.from_html(`<div> </div>`);

export default function Leaf($$anchor, $$props) {
	$.push($$props, false);

	const name = getContext('test');

	$.init();

	var div = root();
	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text, name));
	$.append($$anchor, div);
	$.pop();
}