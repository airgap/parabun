import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	let props = $$props['props'];

	$$renderer.push(`<div${$.attributes({ ...props }, 'svelte-xyz')}>Big red Comic Sans</div>`);
	$.bind_props($$props, { props });
}