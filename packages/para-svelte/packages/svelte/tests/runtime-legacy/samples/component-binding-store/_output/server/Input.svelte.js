import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	let value = $.fallback($$props['value'], '');

	$$renderer.push(`<input${$.attr('value', value)}/>`);
	$.bind_props($$props, { value });
}