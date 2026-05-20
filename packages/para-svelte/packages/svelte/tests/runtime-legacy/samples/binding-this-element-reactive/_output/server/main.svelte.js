import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let div = $$props['div'];

	$$renderer.push(`<div>has div: ${$.escape(!!div)}</div>`);
	$.bind_props($$props, { div });
}