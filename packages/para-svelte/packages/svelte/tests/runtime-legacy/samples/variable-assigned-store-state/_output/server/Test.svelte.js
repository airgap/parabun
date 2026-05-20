import * as $ from 'svelte/internal/server';

export default function Test($$renderer, $$props) {
	var $$store_subs;
	let store = $$props['store'];
	let currentStore;

	function update() {
		currentStore = store;
	}

	$$renderer.push(`<button></button> <p>${$.escape($.store_get($$store_subs ??= {}, '$currentStore', currentStore))}</p>`);

	if ($$store_subs) $.unsubscribe_stores($$store_subs);

	$.bind_props($$props, { store });
}