import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let a = $$props['a'];
	let b = $$props['b'];

	$$renderer.push(`<div${$.attr('data-a', a)}${$.attr('data-b', b)}></div>`);
	$.bind_props($$props, { a, b });
}