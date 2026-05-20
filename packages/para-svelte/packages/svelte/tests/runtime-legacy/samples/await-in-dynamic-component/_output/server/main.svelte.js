import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let flag = $.fallback($$props['flag'], true);

	if (flag && Widget) {
		$$renderer.push('<!--[-->');
		(flag && Widget)($$renderer, {});
		$$renderer.push('<!--]-->');
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push('<!--]-->');
	}

	$.bind_props($$props, { flag });
}