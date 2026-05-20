import * as $ from 'svelte/internal/server';
import A from './A.svelte';
import B from './B.svelte';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];

	if (x ? A : B) {
		$$renderer.push('<!--[-->');
		(x ? A : B)($$renderer, {});
		$$renderer.push('<!--]-->');
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push('<!--]-->');
	}

	$.bind_props($$props, { x });
}