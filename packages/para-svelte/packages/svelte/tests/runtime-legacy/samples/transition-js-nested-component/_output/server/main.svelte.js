import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];

	if (x) {
		$$renderer.push('<!--[0-->');
		Widget($$renderer, {});
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { x });
}