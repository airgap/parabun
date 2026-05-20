import * as $ from 'svelte/internal/server';
import { onMount } from 'svelte';

export default function Two($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let i = $$props['i'];
		let j = $$props['j'];
		let value = $$props['value'];

		onMount(() => {
			value = { i, j };
		});

		$.bind_props($$props, { i, j, value });
	});
}