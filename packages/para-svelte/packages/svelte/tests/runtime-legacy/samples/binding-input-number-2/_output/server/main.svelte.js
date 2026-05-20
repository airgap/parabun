import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], 5);

	$$renderer.push(`<input type="number"${$.attr('value', value)}/>`);
	$.bind_props($$props, { value });
}