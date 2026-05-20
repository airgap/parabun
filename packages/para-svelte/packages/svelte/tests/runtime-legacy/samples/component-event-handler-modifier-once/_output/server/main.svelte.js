import * as $ from 'svelte/internal/server';
import Button from './Button.svelte';

export default function Main($$renderer, $$props) {
	let count = $.fallback($$props['count'], 0);

	Button($$renderer, {
		children: ($$renderer) => {
			$$renderer.push(`<!---->${$.escape(count)}`);
		},
		$$slots: { default: true }
	});

	$.bind_props($$props, { count });
}