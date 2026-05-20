import * as $ from 'svelte/internal/server';
import { onDestroy } from 'svelte';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let data = $$props['data'];

		onDestroy(() => {
			data;
		});

		$$renderer.push(`<!---->${$.escape(data ? '' : null)}`);
		$.bind_props($$props, { data });
	});
}