import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let p = $$props['p'];

	$$renderer.push(`<p>${$.escape(p)}</p>`);
	$.bind_props($$props, { p });
}