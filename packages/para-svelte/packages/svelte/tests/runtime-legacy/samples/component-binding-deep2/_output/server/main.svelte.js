import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let deep = $.fallback($$props['deep'], () => ({ name: 'foo' }), true);
		let $$settled = true;
		let $$inner_renderer;

		function $$render_inner($$renderer) {
			Widget($$renderer, {
				get value() {
					return deep;
				},

				set value($$value) {
					deep = $$value;
					$$settled = false;
				}
			});

			$$renderer.push(`<!----> <p>${$.escape(deep.name)}</p>`);
		}

		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);

		$$renderer.subsume($$inner_renderer);
		$.bind_props($$props, { deep });
	});
}