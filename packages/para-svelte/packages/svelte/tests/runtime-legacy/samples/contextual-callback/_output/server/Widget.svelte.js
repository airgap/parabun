import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let handleClick = $$props['handleClick'];

	$$renderer.push(`<button>click me</button>`);
	$.bind_props($$props, { handleClick });
}