import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let value = $$props['value'];

	$$renderer.push(`<input${$.attr('value', value)}/>`);
	$.bind_props($$props, { value });
}