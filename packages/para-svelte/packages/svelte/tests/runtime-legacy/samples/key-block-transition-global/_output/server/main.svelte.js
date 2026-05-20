import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], 0);
	let toggle = $.fallback($$props['toggle'], true);

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t, u) => {
				node.foo = t;
				node.oof = u;
			}
		};
	}

	if (toggle) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<!---->`);

		{
			$$renderer.push(`<div>${$.escape(value)}</div>`);
		}

		$$renderer.push(`<!---->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--> <button>toggle</button>`);
	$.bind_props($$props, { value, toggle });
}