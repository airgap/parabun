import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let clickHandlerOne = $.fallback($$props['clickHandlerOne'], 0);
	let clickHandlerTwo = $.fallback($$props['clickHandlerTwo'], 0);

	$$renderer.push(`<button>click me</button>`);
	$.bind_props($$props, { clickHandlerOne, clickHandlerTwo });
}