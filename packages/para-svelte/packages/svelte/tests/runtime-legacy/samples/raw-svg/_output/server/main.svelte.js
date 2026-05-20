import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let show = $.fallback($$props['show'], false);

	if (show) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<svg>${$.html('<circle cx="200" cy="500" r="200"></circle>')}</svg>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { show });
}