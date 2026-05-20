import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let id = $.fallback($$props['id'], 'foo');

	$$renderer.push(`<div${$.attr('id', id)}></div>`);
	$.bind_props($$props, { id });
}