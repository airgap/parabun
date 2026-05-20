import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let things = $$props['things'];
	let visible = $$props['visible'];

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	function bar(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.bar = t;
			}
		};
	}

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(things);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let thing = each_array[$$index];

		if (visible) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<div>${$.escape(thing)}</div>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { things, visible });
}