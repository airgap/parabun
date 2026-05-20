import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';
import Bar from './Bar.svelte';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];

	$$renderer.push(`<div>`);

	if (x ? Foo : Bar) {
		$$renderer.push('<!--[-->');
		(x ? Foo : Bar)($$renderer, { x });
		$$renderer.push('<!--]-->');
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push('<!--]-->');
	}

	$$renderer.push(`</div>`);
	$.bind_props($$props, { x });
}