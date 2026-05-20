import * as $ from 'svelte/internal/server';

export default function Component($$renderer, $$props) {
	let action = $$props['action'];

	$$renderer.push(`<div></div>`);
	$.bind_props($$props, { action });
}