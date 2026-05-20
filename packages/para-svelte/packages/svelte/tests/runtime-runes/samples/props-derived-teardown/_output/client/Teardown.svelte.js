import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { onDestroy } from 'svelte';

var root = $.from_html(`<div>teardown</div>`);

export default function Teardown($$anchor, $$props) {
	$.push($$props, true);

	onDestroy(() => {
		$$props.callback();
	});

	var div = root();

	$.append($$anchor, div);
	$.pop();
}