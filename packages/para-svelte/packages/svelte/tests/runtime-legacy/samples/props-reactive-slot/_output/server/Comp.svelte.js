import * as $ from 'svelte/internal/server';

export default function Comp($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);

	$$renderer.push(`<!--[-->`);
	$.slot($$renderer, $$props, 'default', { props: $$sanitized_props }, null);
	$$renderer.push(`<!--]-->`);
}