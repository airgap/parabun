import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = $$props['count'];
		let idToValue = $.fallback($$props['idToValue'], () => Object.create(null), true);

		function ids(count) {
			return new Array(count).fill(null).map((_, i) => ({ id: 'id-' + i })).reverse();
		}

		let $$settled = true;
		let $$inner_renderer;

		function $$render_inner($$renderer) {
			$$renderer.push(`<input type="number"${$.attr('value', count)}/> <ol><!--[-->`);

			const each_array = $.ensure_array_like(ids(count));

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let object = each_array[$$index];

				Nested($$renderer, {
					id: object.id,
					get value() {
						return idToValue[object.id];
					},

					set value($$value) {
						idToValue[object.id] = $$value;
						$$settled = false;
					},

					children: ($$renderer) => {
						$$renderer.push(`<!---->${$.escape(object.id)}: value is ${$.escape(idToValue[object.id])}`);
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