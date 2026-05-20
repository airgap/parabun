import * as $ from 'svelte/internal/server';

export default function App($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);
	const $$restProps = $.rest_props($$sanitized_props, []);

	$$renderer.component(($$renderer) => {
		$: $$restProps.c = $$restProps.c ?? 'c';

		$$renderer.push(`<p>${$.escape($$restProps.a)} ${$.escape($$restProps.b)} ${$.escape($$restProps.c)}</p> <button>update</button>`);
	});
}