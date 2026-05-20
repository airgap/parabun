import * as $ from 'svelte/internal/server';
import { createEventDispatcher } from 'svelte';
import Button from './Button.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const dispatch = createEventDispatcher();
		let value = $$props['value'];

		function handleClick() {
			dispatch('value', { value });
		}

		Button($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<!---->one`);
			},
			$$slots: { default: true }
		});

		$$renderer.push(`<!----> `);

		Button($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<!---->two`);
			},
			$$slots: { default: true }
		});

		$$renderer.push(`<!---->`);
		$.bind_props($$props, { value });
	});
}