import * as $ from 'svelte/internal/server';

export default function Baz($$renderer, $$props) {
	let x = $.fallback($$props['x'], true);

	$.bind_props($$props, { x });
}