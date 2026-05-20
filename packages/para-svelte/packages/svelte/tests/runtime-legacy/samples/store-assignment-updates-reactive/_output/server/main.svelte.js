import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		const a = writable();
		const b = writable();
		let c = $$props['c'];

		function increment() {
			$.store_set(c, $.store_get($$store_subs ??= {}, '$c', c) + 1);
		}

		$: $.store_set(b, $.store_get($$store_subs ??= {}, '$c', c));
		$: $.store_set(a, $.store_get($$store_subs ??= {}, '$b', b));

		$$renderer.push(`<p>a: ${$.escape($.store_get($$store_subs ??= {}, '$a', a))}</p> <p>b: ${$.escape($.store_get($$store_subs ??= {}, '$b', b))}</p> <p>c: ${$.escape($.store_get($$store_subs ??= {}, '$c', c))}</p> <button>+1</button>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { c });
	});
}