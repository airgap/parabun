import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let route = 'a';
		let ok = false;

		function goto(r) {
			return Promise.resolve().then(() => {
				route = r;

				throw new Error('nope');
			});
		}

		function failed($$renderer, error, reset) {
			$$renderer.push(`<button>retry</button>`);
		}

		$$renderer.push(`<h1>${$.escape(route)}</h1> <button>a</button> <button>b</button> <button>c</button> <button>ok</button> `);

		$$renderer.boundary({ failed }, ($$renderer) => {
			$$renderer.push(`<!--[!-->`);

			{
				$$renderer.push(`<p>pending...</p>`);
			}

			$$renderer.push(`<!--]-->`);
		});
	});
}