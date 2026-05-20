import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

export default function A($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		const { i, j, k } = { i: 9, j: 10, k: writable(11) };
		const l = 12;
		const m = 13;
		const n = writable(14);

		let tmp = { a: 9, b: 10, c: writable(11) },
			a = $.fallback($$props['a'], () => tmp.a, true),
			b = $.fallback($$props['b'], () => tmp.b, true),
			c = $.fallback($$props['c'], () => tmp.c, true);

		let d = $.fallback($$props['d'], 12);
		let e = 13;
		let f = $.fallback($$props['f'], () => writable(14), true);

		$$renderer.push(`<div>i: ${$.escape(i)}, j: ${$.escape(j)}, k: ${$.escape($.store_get($$store_subs ??= {}, '$k', k))}, l: 12, m: 13, n: ${$.escape($.store_get($$store_subs ??= {}, '$n', n))}, a: ${$.escape(a)}, b: ${$.escape(b)}, c: ${$.escape($.store_get($$store_subs ??= {}, '$c', c))}, d: ${$.escape(d)}, e: 13, f: ${$.escape($.store_get($$store_subs ??= {}, '$f', f))}</div>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { a, c, d, f, i, k, l, n });
	});
}