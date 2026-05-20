import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let nested = $$props['nested'];

	$$renderer.push(`<span>${$.escape(nested)}</span>`);
	$.bind_props($$props, { nested });
}