import * as $ from 'svelte/internal/server';
import { createEventDispatcher } from 'svelte';

export default function Widget($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const dispatch = createEventDispatcher();
		let logs = $$props['logs'];

		function click() {
			try {
				dispatch('click');
			} catch(error) {
				logs.push(error);
			}
		}

		$$renderer.push(`<button></button>`);
		$.bind_props($$props, { logs });
	});
}