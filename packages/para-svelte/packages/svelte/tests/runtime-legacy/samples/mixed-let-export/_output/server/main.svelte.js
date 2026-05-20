import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let a = $$props['a'];
	let b;
	let c = $$props['c'];
	let d;

	$$renderer.push(`<!---->${$.escape(a)}`);
	$.bind_props($$props, { a, c });
}