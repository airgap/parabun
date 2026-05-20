import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = 0;
		let b = 0;
		let c = 0;
		let d = 0;
		const deferred = [];

		function delay(value) {
			if (!value) return value;

			return new Promise((resolve) => deferred.push(() => resolve(value)));
		}

		$$renderer.push(`<!---->a `);
		$$renderer.push(async () => $.escape(await delay(a)));
		$$renderer.push(` | b `);
		$$renderer.push(async () => $.escape(await delay(b)));
		$$renderer.push(` | c ${$.escape(c)} | d ${$.escape(d)} <button>a and b</button> <button>a and c</button> <button>b and d</button> <button>shift</button> <button>pop</button>`);
	});
}