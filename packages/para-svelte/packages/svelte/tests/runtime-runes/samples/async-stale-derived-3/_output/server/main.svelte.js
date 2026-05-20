import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;
		let other = 0;
		const queue = [];

		function push(v) {
			if (v === 0) return v;

			return new Promise((fulfil) => {
				queue.push(() => fulfil(v));
			});
		}

		$$renderer.push(`<button>increment</button> <button>pop</button> <p>`);
		$$renderer.push(async () => $.escape((await $.save(push(count)))()));
		$$renderer.push(` ${$.escape(count)} ${$.escape(other)}</p>`);
	});
}