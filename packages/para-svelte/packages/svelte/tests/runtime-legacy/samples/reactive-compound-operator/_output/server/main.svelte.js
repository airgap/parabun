import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $.fallback($$props['x'], 0);

	$: x *= 2;

	$$renderer.push(`<button>+1</button> <p>count: ${$.escape(x)}</p>`);
	$.bind_props($$props, { x });
}