import * as $ from 'svelte/internal/server';

export default function Foo($$renderer, $$props) {
	let x = $$props['x'];

	$$renderer.push(`<p>Foo ${$.escape(x)}</p>`);
	$.bind_props($$props, { x });
}