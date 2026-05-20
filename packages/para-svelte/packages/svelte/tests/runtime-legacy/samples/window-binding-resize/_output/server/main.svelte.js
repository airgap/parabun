import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let width = $$props['width'];
	let height = $$props['height'];
	let devicePixelRatio = $$props['devicePixelRatio'];

	$$renderer.push(`<div>${$.escape(width)}x${$.escape(height)}</div> <div>${$.escape(devicePixelRatio)}</div>`);
	$.bind_props($$props, { width, height, devicePixelRatio });
}