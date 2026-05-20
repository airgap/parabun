import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let show = $$props['show'];

	$$renderer.push(`<button>Hide</button>`);
	$.bind_props($$props, { show });
}