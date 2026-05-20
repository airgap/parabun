import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let yes = $$props['yes'];
	let no = $$props['no'];
	let x = $$props['x'];
	let z = $$props['z'];

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
		$$renderer.push(`<div>${$.escape(z)}</div>`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<div>${$.escape(z)}</div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { yes, no, x, z });
}