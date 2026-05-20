import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Test($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		async function c(a) {
			await Promise.resolve();

			if (a) {
				throw new Error('error');
			} else {
				return 'ok';
			}
		}

		let a = void 0;
		var b;
		var $$promises = $$renderer.run([async () => b = await $.async_derived(() => c(a))]);

		$$renderer.push(`<button>`);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(b())));
		$$renderer.push(`</button>`);
	});
}