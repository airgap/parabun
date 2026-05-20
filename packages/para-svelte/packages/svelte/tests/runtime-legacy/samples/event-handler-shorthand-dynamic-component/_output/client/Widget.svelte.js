import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { createEventDispatcher } from 'svelte';

var root = $.from_html(`<button>click me</button>`);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	const dispatch = createEventDispatcher();

	$.init();

	var button = root();

	$.event('click', button, () => dispatch("foo", { answer: 42 }));
	$.append($$anchor, button);
	$.pop();
}