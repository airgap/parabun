import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';

var root = $.from_html(`<div></div> <p> </p>`, 1);

export default function Mount($$anchor, $$props) {
	$.push($$props, false);

	let element = $.mutable_source();
	let bound = $.mutable_source(false);

	onMount(() => {
		if ($.get(element)) $.set(bound, true);
	});

	$.init();

	var fragment = root();
	var div = $.first_child(fragment);

	$.bind_this(div, ($$value) => $.set(element, $$value), () => $.get(element));

	var p = $.sibling(div, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `Bound? ${$.get(bound) ?? ''}`));
	$.append($$anchor, fragment);
	$.pop();
}