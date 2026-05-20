import * as $ from 'svelte/internal/server';

export default function Foo($$renderer, $$props) {
	let y = $.fallback($$props['y'], 'foo');

	$$renderer.push(`<p>y: ${$.escape(y)}</p>`);
	$.bind_props($$props, { y });
}