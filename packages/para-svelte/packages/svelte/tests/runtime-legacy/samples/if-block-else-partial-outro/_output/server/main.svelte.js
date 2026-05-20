import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	let y = $.fallback($$props['y'], false);
	let x = $.fallback($$props['x'], 'x');

	if (y) {
		$$renderer.push('<!--[0-->');
		Foo($$renderer, {});
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<span>${$.escape(x)}</span>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { y, x });
}