import * as $ from 'svelte/internal/server';

export default function Bar($$renderer, $$props) {
	let x = $$props['x'];

	$$renderer.push(`<p>${$.escape(x)}, therefore Bar</p>`);
	$.bind_props($$props, { x });
}