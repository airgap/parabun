import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let clickHandlerOne = $.fallback($$props['clickHandlerOne'], 0);
	let clickHandlerTwo = $.fallback($$props['clickHandlerTwo'], 0);
	let f1;
	let f2;

	f1 = () => clickHandlerOne++;
	f2 = () => clickHandlerTwo++;
	$$renderer.push(`<button>click me</button>`);
	$.bind_props($$props, { clickHandlerOne, clickHandlerTwo });
}