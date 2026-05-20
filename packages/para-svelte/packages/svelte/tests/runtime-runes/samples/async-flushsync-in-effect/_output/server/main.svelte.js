import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { flushSync } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;
		const queue = [];

		function push(v) {
			if (v === 0) return v;

			return new Promise((r) => queue.push(() => r(v)));
		}

		$$renderer.push(`<button>clicks: ${$.escape(count)}</button> <button>shift</button> `);
		$$renderer.push(async () => $.escape(await push(count)));
	});
}