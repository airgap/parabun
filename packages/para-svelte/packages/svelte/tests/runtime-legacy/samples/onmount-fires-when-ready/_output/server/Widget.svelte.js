import * as $ from 'svelte/internal/server';
import { onMount } from 'svelte';

export default function Widget($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let x = $$props['x'];
		let inDocument = $$props['inDocument'];

		onMount(() => {
			inDocument = document.contains(x);
		});

		$$renderer.push(`<p>${$.escape(inDocument)}</p>`);
		$.bind_props($$props, { x, inDocument });
	});
}