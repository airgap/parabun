import * as $ from 'svelte/internal/server';

export default function A($$renderer, $$props) {
	let x = $$props['x'];

	$$renderer.push(`<!--[-->`);
	$.slot($$renderer, $$props, 'foo', { reflected: x }, null);
	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { x });
}