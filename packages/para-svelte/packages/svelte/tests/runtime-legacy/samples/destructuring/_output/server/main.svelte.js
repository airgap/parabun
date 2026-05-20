import * as $ from 'svelte/internal/server';
import { createEventDispatcher } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const dispatch = createEventDispatcher();
		let foo = $$props['foo'];

		$$renderer.push(`<button>click me</button>`);
		$.bind_props($$props, { foo });
	});
}