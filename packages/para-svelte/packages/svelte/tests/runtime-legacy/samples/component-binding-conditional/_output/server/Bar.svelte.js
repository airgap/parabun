import * as $ from 'svelte/internal/server';

export default function Bar($$renderer, $$props) {
	let y = $.fallback($$props['y'], 'bar');

	$$renderer.push(`<p>y: ${$.escape(y)}</p>`);
	$.bind_props($$props, { y });
}