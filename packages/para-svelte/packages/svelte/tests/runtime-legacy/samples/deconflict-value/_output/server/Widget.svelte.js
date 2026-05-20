import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let value = $.fallback($$props['value'], 'foo');

	$.bind_props($$props, { value });
}