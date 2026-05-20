import * as $ from 'svelte/internal/server';
import { derived } from 'svelte/store';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let count = $$props['count'];
		const doubled = derived(count, ($count) => $count * 2);

		$$renderer.push(`<button>count ${$.escape($.store_get($$store_subs ??= {}, '$count', count))}</button> <p>doubled: ${$.escape($.store_get($$store_subs ??= {}, '$doubled', doubled))}</p>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { count });
	});
}