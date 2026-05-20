import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let scrollY = $$props['scrollY'];

	$$renderer.push(`<div style="width: 100%; height: 9999px;"></div>`);
	$.bind_props($$props, { scrollY });
}