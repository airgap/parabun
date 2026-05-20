import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { getContext } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var _unused,
			//This must be created after any $derived(await...)
			bar;

		var $$promises = $$renderer.run([
			async () => _unused = await $.async_derived(() => 1),
			() => bar = $.derived(() => getContext('') ?? 'hi')
		]);

		if (true) {
			$$renderer.push('<!--[0-->');

			let foo;
			var promises = $$renderer.run([() => $$promises[1], () => foo = bar()]);

			$$renderer.async([promises[1]], ($$renderer) => $$renderer.push(() => $.escape(foo)));
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}