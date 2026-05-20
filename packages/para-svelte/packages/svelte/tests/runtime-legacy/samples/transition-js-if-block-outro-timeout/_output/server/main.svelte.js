import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let div = $$props['div'];
	let visible = $$props['visible'];

	function fade(node, params) {
		return {
			duration: 400,
			tick: (t) => {
				node.style.opacity = t;
			}
		};
	}

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div style="opacity: 1;">yes</div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { div, visible });
}