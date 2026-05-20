import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];

	function foo(node, params) {
		return {
			duration: 400,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	function bar(node, params) {
		return {
			duration: 400,
			tick: (t) => {
				node.bar = t;
			}
		};
	}

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div>foo then bar</div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}