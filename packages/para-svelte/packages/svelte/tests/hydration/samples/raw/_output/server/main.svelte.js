import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let raw = $$props['raw'];

	$$renderer.push(`${$.html(raw)}`);
	$.bind_props($$props, { raw });
}