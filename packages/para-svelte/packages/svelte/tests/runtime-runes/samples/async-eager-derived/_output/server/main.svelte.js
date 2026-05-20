import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;

		function push(value) {
			if (!value) return value;

			const { promise, resolve } = Promise.withResolvers();

			resolvers.push(() => resolve(value));

			return promise;
		}

		var delayedCount, derivedCount, resolvers;

		var $$promises = $$renderer.run([
			async () => delayedCount = await $.async_derived(() => push(count)),
			() => {
				derivedCount = $.derived(() => count);
				resolvers = [];
			}
		]);

		$$renderer.push(`<button>clicks: `);
		$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(count)));
		$$renderer.push(` - `);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(delayedCount())));
		$$renderer.push(` - `);
		$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(derivedCount())));
		$$renderer.push(`</button> <button>shift</button> <p>`);
		$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(count !== count)));
		$$renderer.push(` - `);
		$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(derivedCount !== derivedCount())));
		$$renderer.push(`</p>`);
	});
}