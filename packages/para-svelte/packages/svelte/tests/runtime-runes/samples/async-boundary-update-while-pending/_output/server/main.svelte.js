import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let queue = [];

		function push(value) {
			const deferred = Promise.withResolvers();

			queue.push(() => deferred.resolve(value));

			return deferred.promise;
		}

		let count = 0;

		$$renderer.push(`<button>shift</button> <button>increment</button> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<!---->loading`);
		}

		$$renderer.push(`<!--]-->`);
	});
}