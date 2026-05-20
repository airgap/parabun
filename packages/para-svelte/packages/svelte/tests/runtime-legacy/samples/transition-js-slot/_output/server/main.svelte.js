import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	Nested($$renderer, {
		visible,
		children: ($$renderer) => {
			$$renderer.push(`<p>slotted</p>`);
		},
		$$slots: { default: true }
	});

	$.bind_props($$props, { visible });
}