import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x1, x2;
	let width = $.fallback($$props['width'], 100);
	const padding = 10;

	$: x1 = padding;
	$: x2 = width - padding;

	$$renderer.push(`<p>${$.escape(x1)} - ${$.escape(x2)}</p>`);
	$.bind_props($$props, { width });
}