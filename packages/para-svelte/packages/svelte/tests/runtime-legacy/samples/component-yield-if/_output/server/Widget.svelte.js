import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let show = $.fallback($$props['show'], false);

	$$renderer.push(`<p>`);

	if (show) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<!--[-->`);
		$.slot($$renderer, $$props, 'default', {}, null);
		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--></p>`);
	$.bind_props($$props, { show });
}