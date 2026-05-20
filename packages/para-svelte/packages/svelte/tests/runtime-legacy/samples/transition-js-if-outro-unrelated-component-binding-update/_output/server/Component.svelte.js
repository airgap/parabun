import * as $ from 'svelte/internal/server';

export default function Component($$renderer, $$props) {
	let condition = $$props['condition'];

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	let bool = true;

	$$renderer.push(`<button></button> <button></button> `);

	if (bool) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { condition });
}