import * as $ from 'svelte/internal/server';
import Top from './Top.svelte';

export default function Main($$renderer, $$props) {
	let top = $$props['top'];
	let visible = $.fallback($$props['visible'], true);

	if (visible) {
		$$renderer.push('<!--[0-->');
		Top($$renderer, {});
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { top, visible });
}