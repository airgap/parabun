import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let x = $.fallback($$props['x'], false);
		let bar = $.fallback($$props['bar'], () => ({ baz: 42 }), true);
		let $$settled = true;
		let $$inner_renderer;

		function $$render_inner($$renderer) {
			if (x) {
				$$renderer.push('<!--[0-->');

				Widget($$renderer, {
					get foo() {
						return bar.baz;
					},

					set foo($$value) {
						bar.baz = $$value;
						$$settled = false;
					}
				});
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]-->`);
		}

		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);

		$$renderer.subsume($$inner_renderer);
		$.bind_props($$props, { x, bar });
	});
}