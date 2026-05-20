import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;
		let other = 0;
		const queue = [];

		function push(v) {
			if (v === 0) return v;

			return new Promise((resolve) => queue.push(() => resolve(v)));
		}

		$$renderer.push(`<button>increment</button> <button>pop</button> `);

		if (count > 0) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(async () => $.escape(await push(count)));
			$$renderer.push(` ${$.escape(count)} ${$.escape(other)}`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}