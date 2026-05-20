import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var ref, value;

		var $$promises = $$renderer.run([
			() => Promise.resolve(),
			() => {
				ref = null;
				void void 0;
				value = 'value';
			}
		]);

		let $$settled = true;
		let $$inner_renderer;

		function $$render_inner($$renderer) {
			var bind_get = () => value;
			var bind_set = (v) => value = v;

			$$renderer.async_block([$$promises[1]], ($$renderer) => {
				Child($$renderer, {
					get value() {
						return value;
					},

					set value($$value) {
						value = $$value;
						$$settled = false;
					}
				});
			});

			$$renderer.push(` `);

			$$renderer.async_block([$$promises[1]], ($$renderer) => {
				Child($$renderer, {
					get value() {
						return bind_get();
					},

					set value($$value) {
						bind_set($$value);
					}
				});
			});

			$$renderer.push(` <div>`);
			$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(!!ref)));
			$$renderer.push(`</div> `);

			$$renderer.async([$$promises[1]], ($$renderer) => {
				$$renderer.push(`<input${$.attr('value', value)}/>`);
			});

			$$renderer.push(` `);

			$$renderer.async([$$promises[1]], ($$renderer) => {
				$$renderer.push(`<input${$.attr('value', (() => value)())}/>`);
			});
		}

		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);

		$$renderer.subsume($$inner_renderer);
	});
}