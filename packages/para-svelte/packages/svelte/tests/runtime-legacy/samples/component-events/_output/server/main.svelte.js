import * as $ from 'svelte/internal/server';
import { createEventDispatcher } from 'svelte';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const dispatch = createEventDispatcher();
		let visible = $$props['visible'];

		$$renderer.push(`<div>`);

		if (visible) {
			$$renderer.push('<!--[0-->');
			Widget($$renderer, {});
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--></div>`);
		$.bind_props($$props, { visible });
	});
}