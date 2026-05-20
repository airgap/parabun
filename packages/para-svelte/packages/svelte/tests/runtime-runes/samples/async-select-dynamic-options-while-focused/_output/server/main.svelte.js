import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let selected = 'a';
		let items = ['a', 'b'];
		let resolvers = [];
		let select;

		function push(value) {
			const { promise, resolve } = Promise.withResolvers();

			resolvers.push(() => resolve(value));

			return promise;
		}

		$$renderer.push(`<button>add</button> <button>shift</button> <button>reset</button> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>loading...</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}