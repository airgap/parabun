import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];
	let duration = $$props['duration'];

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t * params.k;
			}
		};
	}

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div>fades in</div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible, duration });
}