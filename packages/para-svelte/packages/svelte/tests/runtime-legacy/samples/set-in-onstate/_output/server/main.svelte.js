import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], 1);
	let bar = $$props['bar'];

	$: {
		bar = foo * 2;
	}

	$$renderer.push(`<p>${$.escape(foo)}</p> <p>${$.escape(bar)}</p>`);
	$.bind_props($$props, { foo, bar });
}