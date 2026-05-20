import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let query = '';

		// changing the query results in a new promise with loading initialized to true
		const promise = $.derived(() => push(query));

		const resolvers = [];

		function push(value) {
			if (!value) return Promise.resolve(value);

			const { promise, resolve } = Promise.withResolvers();

			resolvers.push(() => {
				// before resolving, set loading to false - this makes it run in a different batch
				loading = false;

				resolve(value);
			});

			let loading = true;

			Object.defineProperty(promise, 'loading', {
				get() {
					return loading;
				}
			});

			return promise;
		}

		$$renderer.push(`<!---->${$.escape(query)} `);
		$$renderer.push(async () => $.escape(await promise()));
		$$renderer.push(` `);

		if (!promise().loading) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`${$.escape(query)}`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> `);

		if (!promise().loading) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(async () => $.escape(await query));
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> <button>load</button> <button>resolve</button>`);
	});
}