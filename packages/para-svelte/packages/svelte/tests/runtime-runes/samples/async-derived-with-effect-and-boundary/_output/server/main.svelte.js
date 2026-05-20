import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo = null;
		var bar, baz, qux;

		var $$promises = $$renderer.run([
			async () => bar = await $.async_derived(() => 1),
			() => {
				baz = $.derived(() => foo ? foo * bar() : null);
				qux = "qux";
			}
		]);

		$$renderer.push(`<p>baz: `);
		$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(baz())));
		$$renderer.push(`</p> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>Loading...</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}