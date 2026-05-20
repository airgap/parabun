import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { getContext } from 'svelte';

var root = $.from_html(`<div> </div>`);

export default function ChildComponent($$anchor, $$props) {
	$.push($$props, false);

	const value = getContext('foo');

	$.init();

	var div = root();
	var text = $.child(div);

	$.reset(div);
	$.template_effect(() => $.set_text(text, `Value in child component: ${value ?? ''}`));
	$.append($$anchor, div);
	$.pop();
}