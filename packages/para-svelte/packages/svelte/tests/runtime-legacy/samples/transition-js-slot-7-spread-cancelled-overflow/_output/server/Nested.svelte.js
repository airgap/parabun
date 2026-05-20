import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let visible = $$props['visible'];
	let slotProps = $$props['slotProps'];

	function fade(node) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div><!--[-->`);
		$.slot($$renderer, $$props, 'default', $.spread_props([{}, slotProps]), null);
		$$renderer.push(`<!--]--></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible, slotProps });
}