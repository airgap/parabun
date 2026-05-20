import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let deferreds = [];
		let a = 1;
		let b = 2;

		async function push(a, b) {
			var d = Promise.withResolvers();

			deferreds.push(d);
			await d.promise;

			return a + b;
		}

		$$renderer.push(`<button>a++</button> <button>b++</button> <button>shift</button> <button>pop</button> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>loading...</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}