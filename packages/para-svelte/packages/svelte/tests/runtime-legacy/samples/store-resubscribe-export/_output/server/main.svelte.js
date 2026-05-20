import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let foo = $.fallback($$props['foo'], () => writable(0), true);

		$$renderer.push(`<h1>${$.escape($.store_get($$store_subs ??= {}, '$foo', foo))}</h1>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { foo });
	});
}