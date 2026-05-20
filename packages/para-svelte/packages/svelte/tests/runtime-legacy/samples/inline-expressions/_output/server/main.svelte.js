import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let a = $$props['a'];
	let b = $$props['b'];

	$$renderer.push(`<p>${$.escape(a)} + ${$.escape(b)} = ${$.escape(a + b)}</p>`);
	$.bind_props($$props, { a, b });
}