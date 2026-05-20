import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let handler_a;
		let number = 0;
		const handler_1 = () => number = 1;
		const handler_2 = () => number = 2;
		let flag = true;
		const handler_b = writable();

		$: handler_a = flag ? handler_1 : handler_2;
		$: handler_b.set(flag ? handler_1 : handler_2);

		$$renderer.push(`<button>toggle</button> <p>${$.escape(number)}</p> <button>handler_a</button> <button>handler_b</button>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);
	});
}