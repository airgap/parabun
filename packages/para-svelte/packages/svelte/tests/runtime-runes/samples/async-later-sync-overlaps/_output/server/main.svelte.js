import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = 0;
		let b = 0;
		let deferreds = [];

		function push(value) {
			if (!value) return value;

			return new Promise((resolve) => {
				deferreds.push(() => resolve(value));
			});
		}

		$$renderer.push(`<button>a_b ${$.escape(a)}_${$.escape(b)}</button> <button>b ${$.escape(b)}</button> <button>resolve</button> `);
		$$renderer.push(async () => $.escape(await push(a)));
	});
}