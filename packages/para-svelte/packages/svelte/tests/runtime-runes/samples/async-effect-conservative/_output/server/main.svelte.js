import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = 0;
		let two_or_larger = $.derived(() => count >= 2);

		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>loading...</p>`);
		}

		$$renderer.push(`<!--]-->`);
	});
}