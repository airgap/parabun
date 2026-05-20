import * as $ from 'svelte/internal/server';

export default function Outer($$renderer, $$props) {
	let prop = $$props['prop'];

	$$renderer.push(`<!--[-->`);
	$.slot($$renderer, $$props, 'default', { value: prop }, null);
	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { prop });
}