import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let things = $$props['things'];

	function foo(node, params) {
		return {
			delay: params.delay,
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(things);

	for (let i = 0, $$length = each_array.length; i < $$length; i++) {
		let thing = each_array[i];

		$$renderer.push(`<span>${$.escape(thing)}</span>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { things });
}