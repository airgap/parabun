import * as $ from 'svelte/internal/server';
import { onMount } from 'svelte';

export default function Widget($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let isWidget = $$props['isWidget'];

		onMount(() => {
			isWidget = true;
		});

		$$renderer.push(`<p>i am a widget</p>`);
		$.bind_props($$props, { isWidget });
	});
}