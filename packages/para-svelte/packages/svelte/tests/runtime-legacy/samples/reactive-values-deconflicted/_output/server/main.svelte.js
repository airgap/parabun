import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $.fallback($$props['x'], 'waiting');
	let state;

	$: state = x;

	$$renderer.push(`<span>${$.escape(state)}</span>`);
	$.bind_props($$props, { x });
}