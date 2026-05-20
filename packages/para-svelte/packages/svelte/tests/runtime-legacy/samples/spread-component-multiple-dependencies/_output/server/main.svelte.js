import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], false);
	let a = $.fallback($$props['a'], 'a');
	let b = $.fallback($$props['b'], 'b');
	let bar = $.fallback($$props['bar'], () => ({ baz: 'baz' }), true);

	Widget($$renderer, $.spread_props([{ foo: foo ? a : b }, bar]));
	$.bind_props($$props, { foo, a, b, bar });
}