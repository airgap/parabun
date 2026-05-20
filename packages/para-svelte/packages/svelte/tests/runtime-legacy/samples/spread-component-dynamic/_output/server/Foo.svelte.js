import * as $ from 'svelte/internal/server';

export default function Foo($$renderer, $$props) {
	let a = $$props['a'];

	$$renderer.push(`<p>a: ${$.escape(a)}</p>`);
	$.bind_props($$props, { a });
}