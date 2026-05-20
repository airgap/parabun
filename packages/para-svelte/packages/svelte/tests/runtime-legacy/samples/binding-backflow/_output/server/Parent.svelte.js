import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Parent($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let child = $$props['child'];
		let testcase = $$props['testcase'];
		let value = $$props['value'];
		let updates = $.fallback($$props['updates'], () => [], true);

		$: updates = [...updates, value];

		let $$settled = true;
		let $$inner_renderer;

		function $$render_inner($$renderer) {
			$$renderer.push(`<div>parent: ${$.escape(value?.foo)} | updates: ${$.escape(updates.length)}</div> `);

			Child($$renderer, {
				testcase,
				get value() {
					return value;
				},

				set value($$value) {
					value = $$value;
					$$settled = false;
				}
			});

			$$renderer.push(`<!---->`);
		}

		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);

		$$renderer.subsume($$inner_renderer);
		$.bind_props($$props, { child, testcase, value, updates });
	});
}