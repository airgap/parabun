import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Empty from './Empty.svelte';

var root = $.from_html(`<button>destroy component</button> <!>`, 1);

export default function Main($$anchor) {
	let active = $.mutable_source(true);
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.component(node, () => $.get(active) ? Empty : null, ($$anchor, $$component) => {
		$$component($$anchor, {});
	});

	$.event('click', button, () => $.set(active, false));
	$.append($$anchor, fragment);
}