import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { createEventDispatcher } from 'svelte';

var root = $.from_html(`<button>select bar</button>`);

export default function Bar($$anchor, $$props) {
	$.push($$props, false);

	const dispatch = createEventDispatcher();

	$.init();

	var button = root();

	$.event('click', button, () => dispatch("select", { id: "bar" }));
	$.append($$anchor, button);
	$.pop();
}