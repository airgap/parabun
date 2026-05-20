import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let props = $$props['props'];
	let corge = $.fallback($$props['corge'], false);
	let a = $.fallback($$props['a'], 'a');
	let b = $.fallback($$props['b'], 'b');

	$$renderer.push(`<div>`);
	Widget($$renderer, $.spread_props([{ corge: corge ? a : b }, props, { qux: 'named' }]));
	$$renderer.push(`<!----></div>`);
	$.bind_props($$props, { props, corge, a, b });
}