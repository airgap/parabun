import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);
	const $$restProps = $.rest_props($$sanitized_props, []);

	$$renderer.component(($$renderer) => {
		let x, y;

		$: x = Object.keys($$restProps).length;
		$: y = Object.keys($$sanitized_props).length;

		$$renderer.push(`<!---->${$.escape(x)} ${$.escape(y)}`);
	});
}