import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let hidden = $.fallback($$props['hidden'], false);

	$$renderer.push(`<div${$.attr('hidden', hidden)}></div>`);
	$.bind_props($$props, { hidden });
}