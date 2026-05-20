import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let deferred = Promise.withResolvers();

		function failed($$renderer, error, reset) {
			$$renderer.push(`<p>${$.escape(error.message)}</p> <button data-id="reset">reset</button>`);
		}

		$$renderer.push(`<button>step 1</button> <button>step 2</button> <button>step 3</button> `);

		$$renderer.boundary({ failed }, ($$renderer) => {
			$$renderer.push(`<!--[!-->`);

			{
				$$renderer.push(`<p>pending</p>`);
			}

			$$renderer.push(`<!--]-->`);
		});
	});
}