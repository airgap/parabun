import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $.fallback($$props['visible'], false);

	if (visible) {
		$$renderer.push('<!--[0-->');

		if (null) {
			$$renderer.push('<!--[-->');
			(null)($$renderer, {});
			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}