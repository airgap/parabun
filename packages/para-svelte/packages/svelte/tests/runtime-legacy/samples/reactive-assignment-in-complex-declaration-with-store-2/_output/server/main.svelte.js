import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let z;
		let eid = writable(1);
		let foo;
		const u = writable(2);
		const v = writable(3);
		const w = writable(4);
		const x = writable(5);
		const y = writable(6);

		(($$value) => {
			var $$array = $.to_array($$value, 3);

			$.store_set(u, $$array[0]);
			$.store_set(v, $$array[1]);
			$.store_set(w, $$array[2]);
		})([{ id: eid = writable(foo = 2), name: 'xxx' }, 5, 6]);

		(($$value) => {
			$.store_set(x, $$value.a);
			$.store_set(y, $$value.b);
		})({ a: 9, b: 10 });

		function update() {
			(($$value) => {
				var $$array_1 = $.to_array($$value, 3);

				$.store_set(u, $$array_1[0]);
				$.store_set(v, $$array_1[1]);
				$.store_set(w, $$array_1[2]);
			})([{ id: eid = writable(foo = 11), name: 'yyy' }, 12, 13]);

			(($$value) => {
				$.store_set(x, $$value.a);
				$.store_set(y, $$value.b);
			})({ a: 14, b: 15 });
		}

		$: z = $.store_get($$store_subs ??= {}, '$u', u).id;

		$$renderer.push(`<h1>${$.escape(foo)} ${$.escape($.store_get($$store_subs ??= {}, '$eid', eid))} ${$.escape($.store_get($$store_subs ??= {}, '$u', u).name)} ${$.escape($.store_get($$store_subs ??= {}, '$v', v))} ${$.escape($.store_get($$store_subs ??= {}, '$w', w))} ${$.escape($.store_get($$store_subs ??= {}, '$x', x))} ${$.escape($.store_get($$store_subs ??= {}, '$y', y))} ${$.escape($.store_get($$store_subs ??= {}, '$z', z))}</h1>`);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { update });
	});
}