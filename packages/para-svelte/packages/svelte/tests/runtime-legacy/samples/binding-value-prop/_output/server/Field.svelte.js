import * as $ from 'svelte/internal/server';

export default function Field($$renderer, $$props) {
	let value = $$props['value'];

	$$renderer.push(`<input type="text"${$.attr('value', value)}/>`);
	$.bind_props($$props, { value });
}