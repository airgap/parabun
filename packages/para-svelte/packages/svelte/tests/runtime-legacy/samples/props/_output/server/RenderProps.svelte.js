import * as $ from 'svelte/internal/server';

export default function RenderProps($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);

	$$renderer.push(`<p>${$.escape(JSON.stringify($$sanitized_props))}</p>`);
}