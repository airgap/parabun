import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';
import Bar from './Bar.svelte';

export default function Main($$renderer, $$props) {
	let x = $.fallback($$props['x'], Foo);

	if (x) {
		$$renderer.push('<!--[0-->');

		if (x) {
			$$renderer.push('<!--[-->');
			x($$renderer, {});
			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { x, Bar });
}