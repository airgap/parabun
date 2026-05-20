import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = -1;
		let payload = false;
		let updated = false;

		function update() {
			count = 0;

			queueMicrotask(() => {
				payload = true;
			});
		}

		$$renderer.push(`<button>update</button> <p>${$.escape(updated)}</p> `);
		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>pending</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}