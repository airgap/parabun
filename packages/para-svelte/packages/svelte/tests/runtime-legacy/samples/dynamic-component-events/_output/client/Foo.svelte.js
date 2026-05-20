import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { createEventDispatcher } from 'svelte';

var root = $.from_html(`<button>select foo</button>`);

export default function Foo($$anchor, $$props) {
	$.push($$props, false);

	const dispatch = createEventDispatcher();

	$.init();

	var button = root();

	$.event('click', button, () => dispatch("select", { id: "foo" }));
	$.append($$anchor, button);
	$.pop();
}