import * as $ from 'svelte/internal/server';

export default function App($$renderer, $$props) {
	var $$store_subs;
	let store, value;
	let store_container = $$props['store_container'];

	$: ({ store } = store_container);
	$: value = $.store_get($$store_subs ??= {}, '$store', store);

	$$renderer.push(`<div>${$.escape(value)}</div> <div>${$.escape($.store_get($$store_subs ??= {}, '$store', store))}</div>`);

	if ($$store_subs) $.unsubscribe_stores($$store_subs);

	$.bind_props($$props, { store_container });
}