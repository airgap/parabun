import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let count = $$props['count'];

		function get_count() {
			return $.store_get($$store_subs ??= {}, '$count', count);
		}

		$$renderer.push(`<button>+1</button>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { count, get_count });
	});
}