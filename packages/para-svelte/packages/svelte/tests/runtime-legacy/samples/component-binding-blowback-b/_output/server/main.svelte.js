import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = $$props['count'];
		let idToValue = $.fallback($$props['idToValue'], () => Object.create(null), true);
		let ids;

		$: ids = new Array(count).fill(null).map((_, i) => 'id-' + i);

		let $$settled = true;
		let $$inner_renderer;

		function $$render_inner($$renderer) {
			$$renderer.push(`<input type="number"${$.attr('value', count)}/> <ol><!--[-->`);

			const each_array = $.ensure_array_like(ids);

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let id = each_array[$$index];

				Nested($$renderer, {
					id,
					get value() {
						return idToValue[id];
					},

					set value($$value) {
						idToValue[id] = $$value;
						$$settled = false;
					},

					children: ($$renderer) => {
						$$renderer.push(`<!---->${$.escape(id)}: value is ${$.escape(idToValue[id])}`);
					},
					$$slots: { default: true }
				});
			}

			$$renderer.push(`<!--]--></ol>`);
		}

		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);

		$$renderer.subsume($$inner_renderer);
		$.bind_props($$props, { count, idToValue });
	});
}