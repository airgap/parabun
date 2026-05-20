import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let fullscreen = $$props['fullscreen'];

	$$renderer.push(`<div></div>`);
	$.bind_props($$props, { fullscreen });
}