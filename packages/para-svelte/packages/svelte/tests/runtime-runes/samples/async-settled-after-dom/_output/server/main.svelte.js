import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let text = 'hello';
		const resolvers = [];

		function push(value) {
			const { promise, resolve } = Promise.withResolvers();

			resolvers.push(() => resolve(value));

			return promise;
		}

		$$renderer.push(`<button>shift</button> <button>update</button> `);
		$$renderer.push(`<!--[!-->`);

		{}

		$$renderer.push(`<!--]-->`);
	});
}