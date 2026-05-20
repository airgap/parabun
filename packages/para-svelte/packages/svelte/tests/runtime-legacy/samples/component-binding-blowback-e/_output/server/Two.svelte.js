import * as $ from 'svelte/internal/server';

export default function Two($$renderer, $$props) {
	let i = $$props['i'];
	let j = $$props['j'];
	let value = $.fallback($$props['value'], () => ({ i, j }), true);

	$.bind_props($$props, { i, j, value });
}