import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

export default function A_1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		const THING = { a: 1, b: { c: 2, d: [3, 4, writable(5)] }, e: [6], h: 8 };
		const default_g = 9;

		let tmp = THING,
			$$array = $.to_array(tmp.b.d, 3),
			$$array_1 = $.to_array(tmp.e, 1),
			a = $.fallback($$props['a'], () => tmp.a, true),
			c = $.fallback($$props['c'], () => tmp.b.c, true),
			d_one = $.fallback($$props['d_one'], () => $$array[0], true),
			d_three = $.fallback($$props['d_three'], () => $$array[2], true),
			f = $.fallback($$props['f'], () => tmp.b.f, true),
			e_one = $.fallback($$props['e_one'], () => $$array_1[0], true),
			g = $.fallback($$props['g'], () => $.fallback(tmp.g, default_g), true);

		const { a: A, b: { c: C } } = THING;

		$$renderer.push(`<div>a: ${$.escape(a)},
b: ${$.escape(typeof b)},
c: ${$.escape(c)},
d_one: ${$.escape(d_one)},
d_three: ${$.escape($.store_get($$store_subs ??= {}, '$d_three', d_three))},
f: ${$.escape(f)},
g: ${$.escape(g)},
e: ${$.escape(typeof e)},
e_one: ${$.escape(e_one)},
A: ${$.escape(A)},
C: ${$.escape(C)}</div> <div>${$.escape(JSON.stringify(THING))}</div>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { a, c, d_one, d_three, f, e_one, g, A, C });
	});
}