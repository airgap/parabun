import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	let props = $$props['props'];

	if (Foo) {
		$$renderer.push('<!--[-->');
		Foo($$renderer, $.spread_props([props]));
		$$renderer.push('<!--]-->');
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push('<!--]-->');
	}

	$.bind_props($$props, { props });
}