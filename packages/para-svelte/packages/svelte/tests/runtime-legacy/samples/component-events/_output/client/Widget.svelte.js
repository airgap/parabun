import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onDestroy, createEventDispatcher } from 'svelte';

var root = $.from_html(`<p>i am a widget</p>`);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	const dispatch = createEventDispatcher();

	onDestroy(() => {
		dispatch('destroy');
	});

	$.init();

	var p = root();

	$.append($$anchor, p);
	$.pop();
}