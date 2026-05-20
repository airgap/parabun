import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $.fallback($$props['visible'], false);

	function foo(node, _params, options) {
		node.direction = options.direction;

		return { duration: 10 };
	}

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div id="both"></div> <div id="in"></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--> `);

	if (!visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div id="out"></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}