import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let value = $$props['value'];

	$$renderer.push(`<input${$.attr('value', value)}/>`);
	$.bind_props($$props, { value });
}