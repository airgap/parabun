import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let input = 'a';
		let queue = [];

		function push(value) {
			const deferred = Promise.withResolvers();

			queue.push(() => deferred.resolve(value));

			return deferred.promise;
		}

		$$renderer.push(`<button>shift</button> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>loading</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}