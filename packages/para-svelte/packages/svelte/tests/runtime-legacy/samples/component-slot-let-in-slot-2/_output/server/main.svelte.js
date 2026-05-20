import * as $ from 'svelte/internal/server';
import Outer from './Outer.svelte';
import Inner from './Inner.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let prop = $$props['prop'];
		let log = $$props['log'];

		Outer($$renderer, {
			prop,
			children: $.invalid_default_snippet,
			$$slots: {
				default: ($$renderer, { value }) => {
					Inner($$renderer, {
						children: ($$renderer) => {
							$$renderer.push(`<button></button>`);
						},
						$$slots: { default: true }
					});
				}
			}
		});

		$.bind_props($$props, { prop, log });
	});
}