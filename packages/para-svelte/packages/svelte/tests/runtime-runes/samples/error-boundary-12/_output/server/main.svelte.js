import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;

		const d = $.derived(() => {
			if (count === 1) {
				throw new Error('kaboom');
			}

			return count;
		});

		function failed($$renderer) {
			$$renderer.push(`<p>Error occurred</p>`);
		}

		$$renderer.push(`<button>change</button> `);

		$$renderer.boundary({ failed }, ($$renderer) => {
			$$renderer.push(`<!--[-->`);

			{
				$$renderer.push(`<!---->${$.escape(d())}`);
			}

			$$renderer.push(`<!--]-->`);
		});
	});
}