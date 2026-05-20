import * as $ from 'svelte/internal/server';

export default function Echo($$renderer, $$props) {
	let dummy = $$props['dummy'];

	$$renderer.push(`<!--[-->`);
	$.slot($$renderer, $$props, 'default', { dummy }, null);
	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { dummy });
}