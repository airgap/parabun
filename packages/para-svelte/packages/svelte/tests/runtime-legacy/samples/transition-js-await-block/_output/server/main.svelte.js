import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let promise = $$props['promise'];

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	$.await(
		$$renderer,
		promise,
		() => {
			$$renderer.push(`<p class="pending">loading...</p>`);
		},
		(value) => {
			$$renderer.push(`<p class="then">${$.escape(value)}</p>`);
		}
	);

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { promise });
}