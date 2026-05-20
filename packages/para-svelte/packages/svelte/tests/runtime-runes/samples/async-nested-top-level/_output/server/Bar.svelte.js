import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { resolve } from './main.svelte';

export default function Bar($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var bar;

		var $$promises = $$renderer.run([
			async () => bar = await new Promise((r) => resolve.push(() => r('bar')))
		]);

		$$renderer.push(`<p>bar: `);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(bar)));
		$$renderer.push(`</p>`);
	});
}