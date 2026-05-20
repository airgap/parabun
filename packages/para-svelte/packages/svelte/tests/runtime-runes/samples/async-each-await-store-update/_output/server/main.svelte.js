import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		const items = writable([{ id: 1 }]);

		function add_item() {
			items.update((arr) => [...arr, { id: arr.length + 1 }]);
		}

		function query(item) {
			return Promise.resolve([item.id * 10, item.id * 20]);
		}

		$$renderer.push(`<!--[!-->`);

		{
			$$renderer.push(`<p>pending</p>`);
		}

		$$renderer.push(`<!--]-->`);
		$$renderer.push(` <button>add</button>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);
	});
}