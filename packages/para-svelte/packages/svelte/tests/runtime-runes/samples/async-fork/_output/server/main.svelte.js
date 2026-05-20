import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { fork } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;
		const resolvers = [];
		let f = null;

		function push(value) {
			const { promise, resolve } = Promise.withResolvers();

			resolvers.push(() => resolve(value));

			return promise;
		}

		$$renderer.push(`<button>shift</button> <button>increment</button> <button>commit</button> <p>count: ${$.escape(count)}</p> <p>eager: ${$.escape(count)}</p> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>loading...</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}