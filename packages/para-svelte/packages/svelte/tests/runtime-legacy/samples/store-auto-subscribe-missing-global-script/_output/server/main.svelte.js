import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	var $$store_subs;

	$: $.store_get($$store_subs ??= {}, '$missingGlobal', missingGlobal);

	if ($$store_subs) $.unsubscribe_stores($$store_subs);
}