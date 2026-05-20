import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		function failed($$renderer, e) {
			$$renderer.push(`<!---->${$.escape(e.message)}`);
		}

		$$renderer.boundary({ failed }, ($$renderer) => {
			$$renderer.push(`<!--[!-->`);

			{
				$$renderer.push(`<!---->loading`);
			}

			$$renderer.push(`<!--]-->`);
		});
	});
}