import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let store = writable(42);
		let variable = 42;
		let value;
		let value2;

		function updateStore(value) {
			store.set(value);
		}

		function updateVar(value) {
			variable = value;
		}

		$: value = $.store_get($$store_subs ??= {}, '$store', store);
		$: value2 = variable;

		$$renderer.push(`<p>${$.escape(value)}</p> <p>${$.escape(value2)}</p>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { updateStore, updateVar });
	});
}