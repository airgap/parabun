import * as $ from 'svelte/internal/server';
import { onDestroy } from "svelte";

export default function Component($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let checked = $$props['checked'];
		let count = $$props['count'];

		onDestroy(() => {
			console.log(count, checked);
		});

		$$renderer.push(`<p>${$.escape(count)}</p> <button></button>`);
		$.bind_props($$props, { checked, count });
	});
}