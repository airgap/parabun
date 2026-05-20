import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let props = $$props['props'];

	$$renderer.push(`<div>`);
	Widget($$renderer, $.spread_props([props, { qux: 'named' }]));
	$$renderer.push(`<!----></div>`);
	$.bind_props($$props, { props });
}