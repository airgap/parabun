import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	let value = $$props['value'];

	$$renderer.push(`<!--[-->`);
	$.slot($$renderer, $$props, 'default', { value }, null);
	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { value });
}