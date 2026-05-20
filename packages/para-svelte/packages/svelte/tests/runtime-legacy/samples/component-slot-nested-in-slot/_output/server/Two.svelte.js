import * as $ from 'svelte/internal/server';

export default function Two($$renderer, $$props) {
	let b = $$props['b'];

	$$renderer.push(`<!--[-->`);
	$.slot($$renderer, $$props, 'two', { two: b }, null);
	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { b });
}