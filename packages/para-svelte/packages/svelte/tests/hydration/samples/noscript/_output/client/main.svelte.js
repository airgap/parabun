import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from "svelte";

var root = $.from_html(`<noscript></noscript> <h1>Hello!</h1><p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let count = $.mutable_source(0);

	onMount(() => $.update(count));
	$.init();

	var fragment = root();
	var p = $.sibling($.first_child(fragment), 3);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `Count: ${$.get(count) ?? ''}`));
	$.append($$anchor, fragment);
	$.pop();
}