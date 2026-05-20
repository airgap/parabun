import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];
	let name = $$props['name'];

	function foo(node, params) {
		global.count += 1;

		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div>hello ${$.escape(name)}!</div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible, name });
}