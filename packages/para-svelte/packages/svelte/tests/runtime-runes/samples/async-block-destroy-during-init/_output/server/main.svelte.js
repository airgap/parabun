import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;
		let deferreds = [];

		function push() {
			const deferred = Promise.withResolvers();

			deferreds.push(deferred);

			return deferred.promise;
		}

		$$renderer.push(`<button>increment</button> <button>shift</button> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>loading...</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}