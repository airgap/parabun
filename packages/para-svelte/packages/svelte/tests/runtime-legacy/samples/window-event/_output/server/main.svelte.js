import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let width = $$props['width'];
	let height = $$props['height'];

	$$renderer.push(`<div>${$.escape(
		// TODO for some reason this.innerWidth doesn't work as the this context is not the window object during test
		width
	)}x${$.escape(height)}</div>`);

	$.bind_props($$props, { width, height });
}