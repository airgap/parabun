import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	onMount(async () => {
		await 123;
	});

	$.init();
	$.pop();
}