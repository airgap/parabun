import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let condition = $.fallback($$props['condition'], true);

	function foo(node) {
		return {
			duration: 100,
			tick: (t) => {
				node.setAttribute('foo', t);
			}
		};
	}

	if (condition) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div id="t">TRUE</div>`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<div id="f">FALSE</div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { condition });
}