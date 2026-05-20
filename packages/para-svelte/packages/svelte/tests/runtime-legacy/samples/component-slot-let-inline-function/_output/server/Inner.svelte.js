import * as $ from 'svelte/internal/server';

export default function Inner($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let log = $$props['log'];
		let b = $$props['b'];

		function innerCall(a) {
			log(`a: ${a}, b: ${b}`);
		}

		$$renderer.push(`<!--[-->`);
		$.slot($$renderer, $$props, 'inner_slot', { innerCall }, null);
		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { log, b });
	});
}