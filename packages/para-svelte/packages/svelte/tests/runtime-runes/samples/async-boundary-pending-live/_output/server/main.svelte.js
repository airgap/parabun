import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let resolvers = [];

		function push(value) {
			const deferred = Promise.withResolvers();

			resolvers.push(() => deferred.resolve(value));

			return deferred.promise;
		}

		function shift() {
			resolvers.shift()?.();
		}

		let count = 0;

		$$renderer.push(`<button>increment</button> <button>shift</button> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>${$.escape(count)}</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}