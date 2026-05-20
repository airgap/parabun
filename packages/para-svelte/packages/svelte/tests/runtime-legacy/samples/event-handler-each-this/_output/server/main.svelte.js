import * as $ from 'svelte/internal/server';
import { createEventDispatcher } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let items = $$props['items'];
		const dispatch = createEventDispatcher();

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(items);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];

			$$renderer.push(`<button>${$.escape(item)}</button>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { items });
	});
}