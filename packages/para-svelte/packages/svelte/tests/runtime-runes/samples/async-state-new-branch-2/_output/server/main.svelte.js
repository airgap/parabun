import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let x = 'world';
		let y = 0;
		let deferred = [];

		function delay(s) {
			const d = Promise.withResolvers();

			deferred.push(() => d.resolve(s));

			return d.promise;
		}

		$$renderer.push(`<button>x</button> <button>y++</button> <button>resolve</button> `);

		if (x === 'universe') {
			$$renderer.push('<!--[0-->');
			$$renderer.push(async () => $.escape(await delay(x)));
			$$renderer.push(` `);
			Child($$renderer, { x });
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> <hr/> `);

		if (y > 0) {
			$$renderer.push('<!--[0-->');
			Child($$renderer, { x });
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}