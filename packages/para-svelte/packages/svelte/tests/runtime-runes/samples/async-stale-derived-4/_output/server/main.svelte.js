import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let show = true;
		let count = 0;
		const queue = [];

		function push(value) {
			if (!value) return value;

			return new Promise((r) => queue.push(() => r(value)));
		}

		$$renderer.push(`<button>increment</button> <button>hide</button> <button>pop</button> `);
		$$renderer.push(async () => $.escape(await push(count)));
		$$renderer.push(` `);

		if (show) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(async () => $.escape(await push(count)));
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}