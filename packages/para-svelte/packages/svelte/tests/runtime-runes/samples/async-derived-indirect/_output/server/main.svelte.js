import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = 0;
		let b = 0;
		let a_b = $.derived(() => a * b);
		const queued = [];

		function push(value) {
			if (!value) return value;

			return new Promise((resolve) => {
				queued.push(() => resolve(value));
			});
		}

		$$renderer.push(`<button>a</button> <button>b</button> <button>resolve</button> `);

		if (a_b()) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`hi`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> `);
		$$renderer.push(async () => $.escape(await push(a_b())));
	});
}