import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);

	$$renderer.component(($$renderer) => {
		if ('message' in $$sanitized_props) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<p>${$.escape($$sanitized_props.message)}</p>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});
}