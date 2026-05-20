import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];

	if (x) {
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
	$.bind_props($$props, { x });
}