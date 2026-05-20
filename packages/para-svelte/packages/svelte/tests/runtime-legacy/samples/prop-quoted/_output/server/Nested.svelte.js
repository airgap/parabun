import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);

	$$renderer.component(($$renderer) => {
		$$renderer.push(`<!---->${$.escape($$sanitized_props['x-y-z'])}`);
	});
}