import * as $ from 'svelte/internal/server';
import A from './A.svelte';

export default function Main($$renderer, $$props) {
	let visible = $.fallback($$props['visible'], true);

	if (visible) {
		$$renderer.push('<!--[0-->');
		A($$renderer, {});
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}