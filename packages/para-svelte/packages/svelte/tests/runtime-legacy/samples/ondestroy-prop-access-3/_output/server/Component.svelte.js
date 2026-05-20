import * as $ from 'svelte/internal/server';

export default function Component($$renderer, $$props) {
	let ref = $$props['ref'];

	$$renderer.push(`<input/>`);
	$.bind_props($$props, { ref });
}