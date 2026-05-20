import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { fork } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let x = 0;
		let y = 0;
		let f;
		const deferred = [];

		function delay(value) {
			if (!value) return value;

			return new Promise((resolve) => deferred.push(() => resolve(value)));
		}

		$$renderer.push(`<p>${$.escape(x)} `);
		$$renderer.push(async () => $.escape((await $.save(delay(y)))()));
		$$renderer.push(`</p> <button>x</button> <button>y (fork)</button> <button>resolve</button> <button>commit</button>`);
	});
}