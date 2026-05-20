import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let count = $$props['count'];
		let double;

		$: double = $.store_get($$store_subs ??= {}, '$count', count) * 2;

		$$renderer.push(`<button>double ${$.escape(double)}</button>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { count });
	});
}