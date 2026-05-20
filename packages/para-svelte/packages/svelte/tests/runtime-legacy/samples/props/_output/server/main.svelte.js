import * as $ from 'svelte/internal/server';
import RenderProps from './RenderProps.svelte';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];

	RenderProps($$renderer, {
		x,
		children: ($$renderer) => {
			$$renderer.push(`<p>some (unused) slotted content, to create an internal prop</p>`);
		},
		$$slots: { default: true }
	});

	$.bind_props($$props, { x });
}