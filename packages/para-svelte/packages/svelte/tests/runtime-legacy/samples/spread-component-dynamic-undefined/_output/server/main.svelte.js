import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let props = $$props['props'];

	if (undefined) {
		$$renderer.push('<!--[-->');
		undefined($$renderer, $.spread_props([props]));
		$$renderer.push('<!--]-->');
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push('<!--]-->');
	}

	$.bind_props($$props, { props });
}