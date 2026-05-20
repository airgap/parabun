import * as $ from 'svelte/internal/server';

export default function Baz($$renderer, $$props) {
	let x = $$props['x'];

	$$renderer.push(`<button class="baz">baz</button> <p>baz x: ${$.escape(x)}</p>`);
	$.bind_props($$props, { x });
}