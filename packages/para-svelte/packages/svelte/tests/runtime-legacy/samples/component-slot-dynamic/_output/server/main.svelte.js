import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let nested = $$props['nested'];

	Nested($$renderer, {
		children: ($$renderer) => {
			$$renderer.push(`<p>override default slot</p>`);
		},
		$$slots: { default: true }
	});

	$.bind_props($$props, { nested });
}