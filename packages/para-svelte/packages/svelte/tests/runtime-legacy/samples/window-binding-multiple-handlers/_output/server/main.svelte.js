import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let width = $$props['width'];
	let height = $$props['height'];

	$$renderer.push(`<button>Click</button>`);
	$.bind_props($$props, { width, height });
}