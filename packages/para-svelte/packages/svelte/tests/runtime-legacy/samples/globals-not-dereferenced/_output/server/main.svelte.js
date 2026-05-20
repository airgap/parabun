import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];

	$$renderer.push(`<!---->${$.escape(Math.min(x, 5))}`);
	$.bind_props($$props, { x });
}