import * as $ from 'svelte/internal/server';
import { onMount } from 'svelte';
import result from './result.js';

export default function Nested($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let name = $$props['name'];

		onMount(() => {
			result.push(`onMount ${name}`);
		});

		$$renderer.push(`<p>${$.escape(name)}</p>`);
		$.bind_props($$props, { name });
	});
}