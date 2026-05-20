import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	var $$store_subs;
	let observable = $$props['observable'];

	$$renderer.push(`<p>value: ${$.escape($.store_get($$store_subs ??= {}, '$observable', observable))}</p>`);

	if ($$store_subs) $.unsubscribe_stores($$store_subs);

	$.bind_props($$props, { observable });
}