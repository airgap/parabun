import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = false;
		let b = false;
		let deferred = [];

		function push(value) {
			const d = Promise.withResolvers();

			deferred.push(() => d.resolve(value));

			return d.promise;
		}

		$$renderer.push(`<button>a (${$.escape(a)})</button> <button>b (${$.escape(b)})</button> <button>resolve</button> `);

		if (a) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(async () => $.escape(await push(42)));
			$$renderer.push(` `);
			Child($$renderer, {});
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}