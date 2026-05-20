import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let foo1, foo2;
		const store = writable([]);

		$: ({ foo1 } = $.store_get($$store_subs ??= {}, '$store', store));
		$: [foo2] = $.store_get($$store_subs ??= {}, '$store', store);

		$$renderer.push(`<p>${$.escape(foo1)}</p> <p>${$.escape(foo2)}</p>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);
	});
}