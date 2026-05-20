import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	let value = $$props['value'];

	value += 1;
	$$renderer.push(`<p>${$.escape(value)}</p>`);
	$.bind_props($$props, { value });
}