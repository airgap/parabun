import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = $.fallback($$props['a'], () => ({}), true);

		console.log(a.b = true);
		$.bind_props($$props, { a });
	});
}