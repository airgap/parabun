import * as $ from 'svelte/internal/server';

export default function App($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);
	const $$restProps = $.rest_props($$sanitized_props, []);

	$$renderer.component(($$renderer) => {
		function prune() {
			$$restProps.a;
			delete $$restProps.a;

			// should be idempotent
			delete $$restProps.a;
		}

		$$renderer.push(`<button>delete a</button> ${$.escape(JSON.stringify($$restProps))}`);
	});
}