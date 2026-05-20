import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { createEventDispatcher } from "svelte";

var root = $.from_html(`<button>toggle</button>`);

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	const dispatch = createEventDispatcher();

	$.init();

	var button = root();

	$.event('click', button, () => dispatch('event-name'));
	$.append($$anchor, button);
	$.pop();
}