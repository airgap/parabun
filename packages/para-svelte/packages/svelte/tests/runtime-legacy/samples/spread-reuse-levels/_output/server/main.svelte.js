import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let a = $.fallback($$props['a'], 1);
	let x = {};

	Nested($$renderer, $.spread_props([x, { a, b: [1], c: 42 }]));
	$.bind_props($$props, { a });
}