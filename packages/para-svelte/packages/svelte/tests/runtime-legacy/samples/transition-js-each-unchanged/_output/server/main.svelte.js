import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let numbers = $$props['numbers'];

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(numbers);

	for (let i = 0, $$length = each_array.length; i < $$length; i++) {
		let num = each_array[i];

		$$renderer.push(`<div>${$.escape(num)}</div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { numbers });
}