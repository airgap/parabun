import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let data = $.fallback($$props['data'], "Hello");

	$$renderer.push(`<div>`);

	Widget($$renderer, {
		children: ($$renderer) => {
			$$renderer.push(`<!---->${$.escape(data)}`);
		},
		$$slots: { default: true }
	});

	$$renderer.push(`<!----></div>`);
	$.bind_props($$props, { data });
}