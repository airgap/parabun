import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { createEventDispatcher } from 'svelte';

var root = $.from_html(`<button></button>`);

export default function Inner($$anchor, $$props) {
	$.push($$props, false);

	const dispatch = createEventDispatcher();
	const exists = true;
	var $$exports = { exists };

	$.init();

	var button = root();

	$.event('click', button, () => dispatch('bar'));
	$.append($$anchor, button);
	$.bind_prop($$props, 'exists', exists);

	return $.pop($$exports);
}