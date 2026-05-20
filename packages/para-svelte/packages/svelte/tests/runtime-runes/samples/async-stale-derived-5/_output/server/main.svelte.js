import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { getAbortSignal } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const queue = [];
		let n = 1;
		let fizz = true;
		let buzz = true;

		function increment() {
			n++;
			fizz = n % 3 === 0;
			buzz = n % 5 === 0;
		}

		function push(value) {
			if (value === 1) return 1;

			const d = Promise.withResolvers();

			queue.push(() => d.resolve(value));

			const signal = getAbortSignal();

			signal.onabort = () => d.reject(signal.reason);

			return d.promise;
		}

		$$renderer.push(`<button>${$.escape(n)}</button> <button>shift</button> <p>${$.escape(n)} = `);
		$$renderer.push(async () => $.escape((await $.save(push(n)))()));
		$$renderer.push(`</p> `);

		if (true) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<p>fizz: ${$.escape(fizz)}</p>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> `);

		if (true) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<p>buzz: ${$.escape(buzz)}</p>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}