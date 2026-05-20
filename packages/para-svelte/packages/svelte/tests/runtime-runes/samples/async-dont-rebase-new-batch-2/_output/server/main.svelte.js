import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { untrack } from "svelte";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = 0;
		let b = 0;
		let c = 0;
		const queued = [];

		function delay(v) {
			console.log('delay ' + v);

			if (!v) return v;

			return new Promise((resolve) => {
				queued.push(() => resolve(v));
			});
		}

		$$renderer.push(`<button>increment</button> <button>resolve</button> `);
		$$renderer.push(async () => $.escape(await delay(a + b + c)));
	});
}