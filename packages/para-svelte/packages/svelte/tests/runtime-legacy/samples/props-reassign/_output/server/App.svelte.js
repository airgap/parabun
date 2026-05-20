import * as $ from 'svelte/internal/server';

export default function App($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);

	$$renderer.component(($$renderer) => {
		$: $$sanitized_props.a = $$sanitized_props.a * 2;

		$$renderer.push(`<p>${$.escape($$sanitized_props.a)} ${$.escape($$sanitized_props.b)}</p> <button>update</button>`);
	});
}