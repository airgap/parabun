import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	var $$store_subs;
	let store = $$props['store'];

	$$renderer.push(`<p>${$.escape($.store_get($$store_subs ??= {}, '$store', store))}</p>`);

	if ($$store_subs) $.unsubscribe_stores($$store_subs);

	$.bind_props($$props, { store });
}