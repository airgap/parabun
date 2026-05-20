import * as $ from 'svelte/internal/server';
import Span from './Span.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let x = $$props['x'];

		$$renderer.push(`<div>`);

		if (x) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<input/> `);

			Span($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<!---->x`);
				},
				$$slots: { default: true }
			});

			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--></div>`);
		$.bind_props($$props, { x });
	});
}