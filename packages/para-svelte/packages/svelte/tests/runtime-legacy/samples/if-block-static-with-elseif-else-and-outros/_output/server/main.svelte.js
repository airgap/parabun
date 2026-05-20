import * as $ from 'svelte/internal/server';
import RRR from './RRR.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let x = $$props['x'];

		if (("Eva").startsWith('E')) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`eee`);
		} else if (x) {
			$$renderer.push('<!--[1-->');
			$$renderer.push(`def`);
		} else {
			$$renderer.push('<!--[-1-->');
			RRR($$renderer, {});
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { x });
	});
}