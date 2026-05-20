import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { createEventDispatcher } from 'svelte';
import Widget from './Widget.svelte';

var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const dispatch = createEventDispatcher();

	$.init();

	var div = root();
	var node = $.child(div);

	Widget(node, {
		$$events: {
			select: (event) => dispatch("select", event.detail.selection)
		}
	});

	$.reset(div);
	$.append($$anchor, div);
	$.pop();
}