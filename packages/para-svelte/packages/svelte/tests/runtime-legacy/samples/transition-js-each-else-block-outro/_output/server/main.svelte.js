import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let things = $$props['things'];

	function foo(node, params) {
		return {
			duration: 400,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	const each_array = $.ensure_array_like(things);

	if (each_array.length !== 0) {
		$$renderer.push('<!--[-->');

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let thing = each_array[$$index];

			$$renderer.push(`<p>${$.escape(thing)}</p>`);
		}
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push(`<div>else</div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { things });
}