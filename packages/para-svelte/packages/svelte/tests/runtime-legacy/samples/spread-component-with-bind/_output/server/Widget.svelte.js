import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let value = $$props['value'];

	$$renderer.push(`<p>${$.escape(value)}</p> <input${$.attr('value', value)}/>`);
	$.bind_props($$props, { value });
}