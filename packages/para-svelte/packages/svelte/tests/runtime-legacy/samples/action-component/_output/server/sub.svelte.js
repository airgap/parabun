import * as $ from 'svelte/internal/server';

export default function Sub($$renderer, $$props) {
	let action = $$props['action'];
	let state = $$props['state'];

	$$renderer.push(`<div></div>`);
	$.bind_props($$props, { action, state });
}