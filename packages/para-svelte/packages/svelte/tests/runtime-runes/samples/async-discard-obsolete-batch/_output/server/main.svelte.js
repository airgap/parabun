import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { getAbortSignal } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const queue = [];

		function push(value) {
			if (value === 1) return 1;

			const d = Promise.withResolvers();

			queue.push(() => d.resolve(value));

			const signal = getAbortSignal();

			signal.onabort = () => d.reject(signal.reason);

			return d.promise;
		}

		function shift() {
			queue.shift()?.();
		}

		function pop() {
			queue.pop()?.();
		}

		let n = 1;

		$$renderer.push(`<button>${$.escape(n)}</button> <button>shift</button> <button>pop</button> <p>${$.escape(n)} = `);
		$$renderer.push(async () => $.escape((await $.save(push(n)))()));
		$$renderer.push(`</p>`);
	});
}