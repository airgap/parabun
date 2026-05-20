import * as $ from 'svelte/internal/server';

export default function Foo($$renderer, $$props) {
	let x = $$props['x'];

	$$renderer.push(`<p>x: ${$.escape(x)} (${$.escape(typeof x)})</p>`);
	$.bind_props($$props, { x });
}