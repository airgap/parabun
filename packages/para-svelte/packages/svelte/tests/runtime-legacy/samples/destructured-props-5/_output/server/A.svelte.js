import * as $ from 'svelte/internal/server';
import { writable } from "svelte/store";

export default function A($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let default_b = 5;
		const LIST = [1, 2, 3, { a: 4 }, [5, writable(6), writable(7), 8]];

		const [
			x,,
			...[
				,
				{ a: list_two_a, b: list_two_b = default_b },
				[, ...{ length: y }]
			]
		] = LIST;

		let tmp = LIST,
			$$array = $.to_array(tmp),
			$$array_1 = $.to_array($$array.slice(3), 2),
			$$array_2 = $.to_array($$array_1[1]),
			$$array_3 = $.to_array($$array_2.slice(2)),
			l = $.fallback($$props['l'], () => $$array[0], true),
			m = $.fallback($$props['m'], () => $$array[1], true),
			n = $.fallback($$props['n'], () => $$array_1[0].a, true),
			o = $.fallback($$props['o'], () => $.fallback($$array_1[0].b, default_b), true),
			p = $.fallback($$props['p'], () => $$array_2[0], true),
			q = $.fallback($$props['q'], () => $$array_2[1], true),
			r = $.fallback($$props['r'], () => $$array_3[0], true),
			s = $.fallback($$props['s'], () => $$array_3.slice(1).length, true);

		$$renderer.push(`<div>x: ${$.escape(x)}, list_two_a: ${$.escape(list_two_a)}, list_two_b: ${$.escape(list_two_b)}, y: ${$.escape(y)}, l: ${$.escape(l)}, m: ${$.escape(m)},
	n: ${$.escape(n)}, o: ${$.escape(o)}, p: ${$.escape(p)}, q: ${$.escape($.store_get($$store_subs ??= {}, '$q', q))}, r: ${$.escape($.store_get($$store_subs ??= {}, '$r', r))}, s: ${$.escape(s)}</div> <div>${$.escape(JSON.stringify(LIST))}</div>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { l, m, n, o, p, q, r, s, x, list_two_a, list_two_b, y });
	});
}