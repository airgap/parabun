import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		const data = writable({ count: 1 });

		function mutate_count() {
			data.update((d) => {
				d.count++;

				return d;
			});
		}

		async function compute(d) {
			return Promise.resolve(d.count * 10);
		}

		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>pending</p>`);
		}

		$$renderer.push(`<!--]-->`);
		$$renderer.push(` <button>mutate</button>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);
	});
}