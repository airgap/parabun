import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let prop = $$props['prop'];

	$.bind_props($$props, { prop });
}