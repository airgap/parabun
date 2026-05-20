import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let x = $$props['x'];

		let Math = $.fallback(
			$$props['Math'],
			() => ({
				min(a, b) {
					return 'potato';
				}
			}),
			true
		);

		$$renderer.push(`<!---->${$.escape(Math.min(x, 5))}`);
		$.bind_props($$props, { x, Math });
	});
}