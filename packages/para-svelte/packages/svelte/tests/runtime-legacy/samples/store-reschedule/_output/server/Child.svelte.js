import * as $ from 'svelte/internal/server';
import { count } from './stores';

export default function Child($$renderer) {
	var $$store_subs;
	let n = 0;

	$: $.store_set(count, n);

	$$renderer.push(`<button>${$.escape($.store_get($$store_subs ??= {}, '$count', count))}</button>`);

	if ($$store_subs) $.unsubscribe_stores($$store_subs);
}