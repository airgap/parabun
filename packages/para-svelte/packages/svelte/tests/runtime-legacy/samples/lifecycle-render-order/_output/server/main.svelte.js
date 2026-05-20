import * as $ from 'svelte/internal/server';
import { onMount, beforeUpdate, afterUpdate } from 'svelte';
import order from './order.js';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		function identity(x) {
			order.push('render');

			return x;
		}

		beforeUpdate(() => {
			order.push('beforeUpdate');
		});

		afterUpdate(() => {
			order.push('afterUpdate');
		});

		onMount(() => {
			order.push('onMount');
		});

		$$renderer.push(`<!---->${$.escape(identity(42))}`);
	});
}