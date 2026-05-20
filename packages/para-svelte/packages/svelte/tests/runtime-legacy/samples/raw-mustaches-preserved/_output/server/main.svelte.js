import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let raw = $$props['raw'];

	$$renderer.push(`<div>${$.html(raw)}</div>`);
	$.bind_props($$props, { raw });
}