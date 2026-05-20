import * as $ from 'svelte/internal/server';

export default function B($$renderer, $$props) {
	let x = $$props['x'];

	$$renderer.push(`<!--[-->`);
	$.slot($$renderer, $$props, 'default', { reflected: x }, null);
	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { x });
}