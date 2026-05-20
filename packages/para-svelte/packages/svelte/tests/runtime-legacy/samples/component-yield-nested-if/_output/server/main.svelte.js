import * as $ from 'svelte/internal/server';
import Outer from './Outer.svelte';
import Inner from './Inner.svelte';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], true);

	Outer($$renderer, {
		foo,
		children: ($$renderer) => {
			$$renderer.push(`<!---->One `);
			Inner($$renderer, {});
			$$renderer.push(`<!---->`);
		},
		$$slots: { default: true }
	});

	$.bind_props($$props, { foo });
}