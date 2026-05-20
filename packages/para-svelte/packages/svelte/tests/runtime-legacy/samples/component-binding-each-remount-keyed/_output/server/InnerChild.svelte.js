import * as $ from 'svelte/internal/server';

export default function InnerChild($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let val = $.fallback($$props['val'], 1);
		let increment = $$props['increment'];

		$: {
			increment();
		}

		$$renderer.push(`<inner>${$.escape(val)}</inner>`);
		$.bind_props($$props, { val, increment });
	});
}