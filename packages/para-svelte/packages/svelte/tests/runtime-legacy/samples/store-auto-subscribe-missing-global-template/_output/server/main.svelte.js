import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	var $$store_subs;

	$$renderer.push(`<p>${$.escape($.store_get($$store_subs ??= {}, '$missingGlobal', missingGlobal))}</p>`);

	if ($$store_subs) $.unsubscribe_stores($$store_subs);
}