import * as $ from 'svelte/internal/server';

export default function Foo($$renderer, $$props) {
	let x = $$props['x'];

	$$renderer.push(`<p>${$.escape(x)}, therefore Foo</p>`);
	$.bind_props($$props, { x });
}