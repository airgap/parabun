import * as $ from 'svelte/internal/server';

export default function Component($$renderer, $$props) {
	var $$store_subs;
	let condition = $$props['condition'];

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	$.store_get($$store_subs ??= {}, '$condition', condition);

	let bool = true;

	$$renderer.push(`<button></button> `);

	if (bool) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);

	if ($$store_subs) $.unsubscribe_stores($$store_subs);

	$.bind_props($$props, { condition });
}