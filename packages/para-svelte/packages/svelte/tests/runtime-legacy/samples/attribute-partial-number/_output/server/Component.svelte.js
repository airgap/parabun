import * as $ from 'svelte/internal/server';

export default function Component($$renderer, $$props) {
	let value = $$props['value'];

	$$renderer.push(`<p${$.attr('data-value', value)}></p>`);
	$.bind_props($$props, { value });
}