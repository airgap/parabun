import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let a = $$props['a'];
	const b = 2;

	$$renderer.push(`<p>a: ${$.escape(a)}</p> <p>b: 2</p>`);
	$.bind_props($$props, { a, b });
}