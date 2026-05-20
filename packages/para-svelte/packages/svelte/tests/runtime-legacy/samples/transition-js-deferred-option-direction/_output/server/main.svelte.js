import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];

	function foo(node, _params, options) {
		node.directions = options.direction;

		return (opts) => {
			node.directions += "," + opts.direction;

			return { duration: 10 };
		};
	}

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div id="both-in"></div> <div id="in"></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--> `);

	if (!visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div id="out"></div> <div id="both-out"></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}