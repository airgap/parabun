import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onDestroy } from 'svelte';

export default function Empty($$anchor, $$props) {
	$.push($$props, false);

	onDestroy(() => {
		console.log('destroy');
	});

	$.init();
	$.pop();
}