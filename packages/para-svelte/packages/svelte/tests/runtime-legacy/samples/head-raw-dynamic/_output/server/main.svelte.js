import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';
import Bar from './Bar.svelte';

export default function Main($$renderer, $$props) {
	let condition = $$props['condition'];
	let foo = $$props['foo'];
	let bar = $$props['bar'];

	if (condition === 1) {
		$$renderer.push('<!--[0-->');
		Foo($$renderer, { foo });
	} else if (condition === 2) {
		$$renderer.push('<!--[1-->');
		Bar($$renderer, { bar });
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { condition, foo, bar });
}