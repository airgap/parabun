import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';

var root = $.from_html(`<div></div>`);

export default function Input($$anchor, $$props) {
	$.push($$props, false);

	onMount(() => {
		console.log(42);
	});

	$.init();

	var div = root();

	$.append($$anchor, div);
	$.pop();
}