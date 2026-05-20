import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	let bar;
	let foo = $.fallback($$props['foo'], true);

	$: bar = () => true;

	if (foo) {
		$$renderer.push('<!--[0-->');
		Foo($$renderer, {});
	} else if (bar()) {
		$$renderer.push('<!--[1-->');
		$$renderer.push(`bar`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`else`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { foo });
}