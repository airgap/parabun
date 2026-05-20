import * as $ from 'svelte/internal/server';
import { afterUpdate, beforeUpdate, onMount } from 'svelte';
import order from './order.js';
import Item from './Item.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let n = $.fallback($$props['n'], 0);

		function logRender(n) {
			order.push(`parent: render ${n}`);

			return 'parent';
		}

		beforeUpdate(() => {
			order.push(`parent: beforeUpdate ${n}`);
		});

		afterUpdate(() => {
			order.push(`parent: afterUpdate ${n}`);
		});

		onMount(() => {
			order.push(`parent: onMount ${n}`);
		});

		$$renderer.push(`<!---->${$.escape(logRender(n))} <ul><!--[-->`);

		const each_array = $.ensure_array_like([1, 2, 3]);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let index = each_array[$$index];

			Item($$renderer, { index, n });
		}

		$$renderer.push(`<!--]--></ul>`);
		$.bind_props($$props, { n });
	});
}