import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let value = $.fallback($$props['value'], 'Loading...');

	$$renderer.push(`<!---->${$.escape(value)}`);
	$.bind_props($$props, { value });
}