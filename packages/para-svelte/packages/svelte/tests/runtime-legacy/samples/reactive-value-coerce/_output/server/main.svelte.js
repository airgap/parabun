import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = $.fallback($$props['a'], () => ({ b: [1] }), true);
		const identity = (x) => x;

		$$renderer.push(`<!---->${$.escape(a.b)}-${$.escape(identity(a.b))}`);
		$.bind_props($$props, { a });
	});
}