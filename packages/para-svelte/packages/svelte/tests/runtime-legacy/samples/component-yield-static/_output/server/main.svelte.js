import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let name = $.fallback($$props['name'], '');

	Widget($$renderer, {
		children: ($$renderer) => {
			$$renderer.push(`<!---->Hello`);
		},
		$$slots: { default: true }
	});

	$$renderer.push(`<!----> ${$.escape(name)}`);
	$.bind_props($$props, { name });
}