import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let fields = $.fallback($$props['fields'], () => ['firstname', 'lastname'], true);
		let values = $.fallback($$props['values'], () => ({ firstname: '', lastname: '' }), true);
		let $$settled = true;
		let $$inner_renderer;

		function $$render_inner($$renderer) {
			$$renderer.push(`<!--[-->`);

			const each_array = $.ensure_array_like(fields);

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let field = each_array[$$index];

				Nested($$renderer, {
					field,
					get value() {
						return values[field];
					},

					set value($$value) {
						values[field] = $$value;
						$$settled = false;
					}
				});
			}

			$$renderer.push(`<!--]-->`);
		}

		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);

		$$renderer.subsume($$inner_renderer);
		$.bind_props($$props, { fields, values });
	});
}