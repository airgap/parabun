import * as $ from 'svelte/internal/server';
import { onMount } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo = $.fallback($$props['foo'], 1);

		onMount(() => {
			foo = 2;
		});

		$$renderer.push(`<p>${$.escape(foo)}</p>`);
		$.bind_props($$props, { foo });
	});
}