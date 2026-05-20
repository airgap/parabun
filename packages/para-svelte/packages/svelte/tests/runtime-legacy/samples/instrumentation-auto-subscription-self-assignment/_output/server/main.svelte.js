import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let bar;
		const foo = writable([]);

		function go() {
			$.store_get($$store_subs ??= {}, '$foo', foo).push(42);
			$.store_set(foo, $.store_get($$store_subs ??= {}, '$foo', foo));
		}

		$: bar = $.store_get($$store_subs ??= {}, '$foo', foo);

		$$renderer.push(`<!---->${$.escape(JSON.stringify(bar))}`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { go });
	});
}