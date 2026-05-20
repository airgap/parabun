import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;
		let other = 0;
		const queue = [];

		function push(v) {
			return new Promise((r, e) => queue.push(() => v === 1 ? e(v) : r(v)));
		}

		$$renderer.push(`<button>increment</button> <button>pop</button> `);

		if (count > 0) {
			$$renderer.push('<!--[0-->');

			function failed($$renderer) {
				$$renderer.push(`<!---->boom`);
			}

			$$renderer.boundary({ failed }, ($$renderer) => {
				$$renderer.push(`<!--[-->`);

				{
					$$renderer.push(`<!---->`);
					$$renderer.push(async () => $.escape(await push(count)));
					$$renderer.push(` ${$.escape(count)} ${$.escape(other)}`);
				}

				$$renderer.push(`<!--]-->`);
			});
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}