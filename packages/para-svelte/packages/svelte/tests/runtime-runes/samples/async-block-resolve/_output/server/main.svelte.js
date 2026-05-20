import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let resolvers = [];

		function push(value) {
			const { promise, resolve } = Promise.withResolvers();

			resolvers.push(() => resolve(value));

			return promise;
		}

		let count = 0;

		$$renderer.push(`<button>${$.escape(count)}</button> <button>shift</button> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>loading...</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}