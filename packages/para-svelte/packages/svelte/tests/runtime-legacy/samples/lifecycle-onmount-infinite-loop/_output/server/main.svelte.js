import * as $ from 'svelte/internal/server';
import { onMount, mount } from 'svelte';
import Child from './Child.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let root;
		let count = $.fallback($$props['count'], 0);

		onMount(() => {
			if (count < 5) {
				count++;
				mount(Child, { target: root });
			}
		});

		$$renderer.push(`<div></div>`);
		$.bind_props($$props, { count });
	});
}