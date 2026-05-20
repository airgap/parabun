import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	var $$store_subs;
	let a = $$props['a'];
	let b = $$props['b'];
	let c = $$props['c'];

	$$renderer.push(`<!---->${$.escape($.store_get($$store_subs ??= {}, '$b', b))}`);

	if ($$store_subs) $.unsubscribe_stores($$store_subs);

	$.bind_props($$props, { a, b, c });
}