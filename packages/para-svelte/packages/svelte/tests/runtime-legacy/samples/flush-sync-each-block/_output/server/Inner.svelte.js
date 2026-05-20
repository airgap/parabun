import * as $ from 'svelte/internal/server';

export default function Inner($$renderer, $$props) {
	let value = $$props['value'];

	$$renderer.push(`<!---->${$.escape(value)}`);
	$.bind_props($$props, { value });
}