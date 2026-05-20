import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let threshold = $$props['threshold'];

	function foo(node) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let number = each_array[$$index];

		if (threshold >= number) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<div>${$.escape(number)}</div>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { threshold });
}