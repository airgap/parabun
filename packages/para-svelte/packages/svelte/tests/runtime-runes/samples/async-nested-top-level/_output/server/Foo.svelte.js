import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { resolve } from './main.svelte';
import Bar from './Bar.svelte';

export default function Foo($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var foo;

		var $$promises = $$renderer.run([
			async () => foo = await new Promise((r) => resolve.push(() => r('foo')))
		]);

		$$renderer.push(`<p>foo: `);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(foo)));
		$$renderer.push(`</p> `);
		Bar($$renderer, {});
		$$renderer.push(`<!---->`);
	});
}