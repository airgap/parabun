import * as $ from 'svelte/internal/server';
import { model } from "./store.svelte";

export default function Inner($$renderer, $$props) {
	var $$store_subs;
	let value = $.fallback($$props['value'], '');

	$$renderer.push(`<input${$.attr('value', $.store_get($$store_subs ??= {}, '$model', model))}/> ${$.escape(value)}`);

	if ($$store_subs) $.unsubscribe_stores($$store_subs);

	$.bind_props($$props, { value });
}