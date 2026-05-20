import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';

var root = $.from_html(`<h1>Hello world!</h1> <div> </div>`, 1);

export default function Input($$anchor, $$props) {
	$.push($$props, false);

	let count = $.mutable_source(0);

	onMount(() => {
		const id = setInterval(() => $.update(count), 1000);
		const clear = () => clearInterval(id);

		return clear;
	});

	$.init();

	var fragment = root();
	var div = $.sibling($.first_child(fragment), 2);
	var text = $.child(div);

	$.reset(div);
	$.template_effect(() => $.set_text(text, `Counter value: ${$.get(count) ?? ''}`));
	$.append($$anchor, fragment);
	$.pop();
}