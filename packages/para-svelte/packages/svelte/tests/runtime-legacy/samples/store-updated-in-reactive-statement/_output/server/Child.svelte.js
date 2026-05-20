import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';
import { store } from './state.js';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let value = $$props['value'];
		const copy = writable(value);

		$: {
			copy.set(value);
			store.set({ value });
		}

		$$renderer.push(`<p>${$.escape($.store_get($$store_subs ??= {}, '$copy', copy))}</p>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { value });
	});
}