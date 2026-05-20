import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], () => ({ x: 1 }), true);
	let bar = $.fallback($$props['bar'], () => ({ x: 1 }), true);

	$: {
		bar = foo;
	}

	Widget($$renderer, { foo, bar });
	$.bind_props($$props, { foo, bar });
}