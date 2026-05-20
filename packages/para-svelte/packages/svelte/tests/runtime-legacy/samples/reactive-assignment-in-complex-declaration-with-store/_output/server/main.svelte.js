import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let z;
		let eid = writable(1);
		let foo;
		let u;
		let v;
		let w;
		let x;
		let y;

		[u, v, w] = [{ id: eid = writable(foo = 2), name: 'xxx' }, 5, writable(6)];
		({ a: x, b: y } = { a: writable(9), b: writable(10) });

		function update() {
			[u, v, w] = [
				{ id: eid = writable(foo = 11), name: 'yyy' },
				12,
				writable(13)
			];

			({ a: x, b: y } = { a: writable(14), b: writable(15) });
		}

		$: z = u.id;

		$$renderer.push(`<h1>${$.escape(foo)} ${$.escape($.store_get($$store_subs ??= {}, '$eid', eid))} ${$.escape(u.name)} ${$.escape(v)} ${$.escape($.store_get($$store_subs ??= {}, '$w', w))} ${$.escape($.store_get($$store_subs ??= {}, '$x', x))} ${$.escape($.store_get($$store_subs ??= {}, '$y', y))} ${$.escape($.store_get($$store_subs ??= {}, '$z', z))}</h1>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { update });
	});
}