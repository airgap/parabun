import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';
import { createEventDispatcher } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const dispatch = createEventDispatcher();
		let items = $$props['items'];

		function foo(item) {
			dispatch('foo', item);
		}

		$$renderer.push(`<div><!--[-->`);

		const each_array = $.ensure_array_like(items);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];

			Widget($$renderer, {});
		}

		$$renderer.push(`<!--]--></div>`);
		$.bind_props($$props, { items });
	});
}