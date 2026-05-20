import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { resolve } from './main.svelte';

export default function Foo($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var foo, bar;

		var $$promises = $$renderer.run([
			async () => foo = await $.async_derived(() => new Promise((r) => resolve.push(() => r('foo')))),
			async () => bar = await $.async_derived(() => new Promise((r) => resolve.push(() => r('bar'))))
		]);

		$$renderer.push(`<p>`);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(foo())));
		$$renderer.push(` `);
		$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(bar())));
		$$renderer.push(`</p>`);
	});
}