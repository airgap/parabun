import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];

	function foo(node) {
		console.log('in');

		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	function bar(node) {
		console.log('out');

		return {
			duration: 100,
			tick: (t) => {
				node.bar = t;
			}
		};
	}

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<span>hello</span>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}