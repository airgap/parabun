import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], 0);

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t, u) => {
				node.foo = t;
				node.oof = u;
			}
		};
	}

	$$renderer.push(`<!---->`);

	{
		$$renderer.push(`<div>${$.escape(value)}</div>`);
	}

	$$renderer.push(`<!---->`);
	$.bind_props($$props, { value });
}