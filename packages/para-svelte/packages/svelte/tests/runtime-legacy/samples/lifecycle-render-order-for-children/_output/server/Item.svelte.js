import * as $ from 'svelte/internal/server';
import { afterUpdate, beforeUpdate, onMount } from 'svelte';
import order from './order.js';

export default function Item($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let index = $$props['index'];
		let n = $$props['n'];

		function logRender(n) {
			order.push(`${index}: render ${n}`);

			return index;
		}

		beforeUpdate(() => {
			order.push(`${index}: beforeUpdate ${n}`);
		});

		afterUpdate(() => {
			order.push(`${index}: afterUpdate ${n}`);
		});

		onMount(() => {
			order.push(`${index}: onMount ${n}`);
		});

		$$renderer.push(`<li>${$.escape(logRender(n))}</li>`);
		$.bind_props($$props, { index, n });
	});
}