import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let arriving = $.fallback($$props['arriving'], true);

	$$renderer.push(`<div>`);

	if (arriving) {
		$$renderer.push('<!--[0-->');

		Widget($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<!---->Hello`);
			},
			$$slots: { default: true }
		});
	} else {
		$$renderer.push('<!--[-1-->');

		Widget($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<!---->Goodbye`);
			},
			$$slots: { default: true }
		});
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { arriving });
}