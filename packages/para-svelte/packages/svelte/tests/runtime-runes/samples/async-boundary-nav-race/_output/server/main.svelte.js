import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let page = 'a';

		/** @type {Array<() => void>} */
		const a = [];

		/** @type {Array<() => void>} */
		const b = [];

		function gate(next) {
			const deferred = Promise.withResolvers();

			if (next === 'a') a.push(deferred.resolve); else b.push(deferred.resolve);

			return deferred.promise;
		}

		function nav(next) {
			page = next;
		}

		const to_render = $.derived(() => page === 'a' ? snippet_a : snippet_b);

		function snippet_a($$renderer) {
			$$renderer.push(`<!--[!-->`);

			{
				$$renderer.push(`<p>pending a</p>`);
			}

			$$renderer.push(`<!--]-->`);
		}

		function snippet_b($$renderer) {
			$$renderer.push(`<!--[!-->`);

			{
				$$renderer.push(`<p>pending b</p>`);
			}

			$$renderer.push(`<!--]-->`);
		}

		$$renderer.push(`<button>a</button> <button>b</button> <button>resolve a</button> <button>resolve b</button>  `);
		to_render()($$renderer);
		$$renderer.push(`<!---->`);
	});
}