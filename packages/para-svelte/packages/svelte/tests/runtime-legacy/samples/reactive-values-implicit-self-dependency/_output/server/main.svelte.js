import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let max;
	let num = $.fallback($$props['num'], 1);

	$: max = Math.max(num, max || 0);

	$$renderer.push(`<p>${$.escape(num)} / ${$.escape(max)}</p>`);
	$.bind_props($$props, { num });
}