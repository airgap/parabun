import * as $ from 'svelte/internal/server';

export default function Bar($$renderer, $$props) {
	let x = $.fallback($$props['x'], 'no');

	$$renderer.push(`<p>Bar: ${$.escape(x)}</p>`);
	$.bind_props($$props, { x });
}