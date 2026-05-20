import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];
	let things = $$props['things'];

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	if (x) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(things);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let thing = each_array[$$index];

			$$renderer.push(`<div></div>`);
		}

		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { x, things });
}