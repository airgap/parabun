import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Child from "./Child.svelte";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;
		let deferreds = [];

		function push(v) {
			return new Promise((resolve, reject) => {
				deferreds.push({ resolve: () => resolve(v), reject });
			});
		}

		$$renderer.push(`<button>increment</button> <button>resolve</button> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>loading...</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}