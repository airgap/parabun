import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

export default function A($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let default_b = 5;
		const LIST = [1, { a: 2 }, [3, writable(4)]];
		const [x, { a: list_two_a, b: list_two_b = default_b }, [, y]] = LIST;

		let tmp = LIST,
			$$array = $.to_array(tmp, 3),
			$$array_1 = $.to_array($$array[2], 2),
			m = $.fallback($$props['m'], () => $$array[0], true),
			n = $.fallback($$props['n'], () => $$array[1].a, true),
			o = $.fallback($$props['o'], () => $.fallback($$array[1].b, default_b), true),
			p = $.fallback($$props['p'], () => $$array_1[0], true),
			q = $.fallback($$props['q'], () => $$array_1[1], true);

		$$renderer.push(`<div>x: ${$.escape(x)},
  list_two_a: ${$.escape(list_two_a)},
  list_two_b: ${$.escape(list_two_b)},
  y: ${$.escape($.store_get($$store_subs ??= {}, '$y', y))},
  m: ${$.escape(m)},
  n: ${$.escape(n)},
  o: ${$.escape(o)},
  p: ${$.escape(p)},
  q: ${$.escape($.store_get($$store_subs ??= {}, '$q', q))}</div> <div>${$.escape(JSON.stringify(LIST))}</div>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { m, n, o, p, q, x, list_two_a, list_two_b, y });
	});
}