import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];
	let y = $$props['y'];
	let width = $$props['width'];
	let height = $$props['height'];

	$$renderer.push(`<svg><rect${$.attr('x', x)}${$.attr('y', y)}${$.attr('width', width)}${$.attr('height', height)}></rect></svg><svg><rect${$.attr('x', x)}${$.attr('y', y)}${$.attr('width', width)}${$.attr('height', height)}></rect></svg>`);
	$.bind_props($$props, { x, y, width, height });
}