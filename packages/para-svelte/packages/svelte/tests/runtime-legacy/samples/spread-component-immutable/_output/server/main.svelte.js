import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let obj = $$props['obj'];

	Widget($$renderer, $.spread_props([obj, { x: 2 }]));
	$.bind_props($$props, { obj });
}