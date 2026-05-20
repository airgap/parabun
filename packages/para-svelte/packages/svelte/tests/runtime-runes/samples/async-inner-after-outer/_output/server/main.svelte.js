import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let show = true;
		let count = 0;
		let queue = [];

		function foo() {
			const { promise, resolve } = Promise.withResolvers();
			const s = show;

			queue.push(() => resolve(s));

			return promise;
		}

		function bar() {
			const { promise, resolve } = Promise.withResolvers();
			const s = show;

			queue.push(() => {
				// This will create a new batch while the other batch is still in flight
				count++;

				resolve(s);
			});

			return promise;
		}

		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>loading...</p>`);
		}

		$$renderer.push(`<!--]-->`);
		$$renderer.push(` <button>shift</button>`);
	});
}