import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { fork } from 'svelte';
import Child from './Child.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let x = 'world';
		let y = 0;
		let f;
		const deferred = [];

		function delay(value) {
			if (value !== 'universe') return value;

			return new Promise((resolve) => deferred.push(() => resolve(value)));
		}

		function delay2(value) {
			return new Promise((resolve) => deferred.push(() => resolve(value)));
		}

		$$renderer.push(`<button>x</button> <button>y++</button> <button>resolve</button> <button>commit</button> `);

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

			$$renderer.child_block(async ($$renderer) => {
				const $$0 = (await $.save(delay2(x)))();

				Child($$renderer, { x: $$0 });
			});
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}