import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let yes = $$props['yes'];
	let no = $$props['no'];
	let x = $$props['x'];

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
		$$renderer.push(`<div>yes</div>`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<div>no</div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { yes, no, x });
}