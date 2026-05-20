import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let a = $.fallback($$props['a'], 1);
	let doubled = $$props['doubled'];

	$: doubled = a * 2;

	$$renderer.push(`<p>doubled: ${$.escape(doubled)}</p>`);
	$.bind_props($$props, { a, doubled });
}