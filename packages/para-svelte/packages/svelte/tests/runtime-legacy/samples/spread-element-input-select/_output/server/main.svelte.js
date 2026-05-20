import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], 'World');
	let spread = $.fallback($$props['spread'], () => ({}), true);

	$$renderer.select({ value, ...spread }, ($$renderer) => {
		$$renderer.option({}, ($$renderer) => {
			$$renderer.push(`Hello`);
		});

		$$renderer.option({}, ($$renderer) => {
			$$renderer.push(`World`);
		});
	});

	$.bind_props($$props, { value, spread });
}