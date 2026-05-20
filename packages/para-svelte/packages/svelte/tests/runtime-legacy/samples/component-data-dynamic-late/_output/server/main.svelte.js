import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], false);
	let q = $$props['q'];

	if (foo) {
		$$renderer.push('<!--[0-->');
		Widget($$renderer, { p: q });
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { foo, q });
}