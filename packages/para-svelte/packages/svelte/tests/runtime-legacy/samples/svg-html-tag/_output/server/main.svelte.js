import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let circle;
	let width = $.fallback($$props['width'], 100);
	let height = $.fallback($$props['height'], 60);

	$: circle = `<circle cx="${width / 4}" cy="${height / 2}" r="24" fill="#FFD166"/>`;

	$$renderer.push(`<svg${$.attr('width', width)}${$.attr('height', height)}>${$.html(circle)}<circle${$.attr('cx', width / 4 * 3)}${$.attr('cy', height / 2)} r="24" fill="#118AB2"></circle></svg>`);
	$.bind_props($$props, { width, height });
}