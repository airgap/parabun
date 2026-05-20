import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let circle;
	let width = $.fallback($$props['width'], 100);
	let height = $.fallback($$props['height'], 60);

	$: circle = `<circle cx="${width / 4}" cy="${height / 2}" r="24" fill="#FFD166"></circle>`;

	$$renderer.push(`<svg><foreignObject>${$.html(circle)}</foreignObject></svg>`);
	$.bind_props($$props, { width, height });
}