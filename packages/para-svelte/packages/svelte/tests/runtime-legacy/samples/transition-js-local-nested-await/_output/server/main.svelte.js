import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];
	let promise = $$props['promise'];

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

		$.await($$renderer, promise, () => {}, (value) => {
			$$renderer.push(`<div></div>`);
		});

		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { x, promise });
}