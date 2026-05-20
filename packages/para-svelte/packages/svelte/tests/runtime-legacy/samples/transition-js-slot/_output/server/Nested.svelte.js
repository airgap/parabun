import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let visible = $$props['visible'];

	$$renderer.push(`<div>`);

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<!--[-->`);
		$.slot($$renderer, $$props, 'default', {}, null);
		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { visible });
}