import * as $ from 'svelte/internal/server';

export default function Rect($$renderer, $$props) {
	let x = $$props['x'];
	let y = $$props['y'];
	let width = $$props['width'];
	let height = $$props['height'];

	$$renderer.push(`<rect${$.attr('x', x)}${$.attr('y', y)}${$.attr('width', width)}${$.attr('height', height)}></rect>`);
	$.bind_props($$props, { x, y, width, height });
}