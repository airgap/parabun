import * as $ from 'svelte/internal/server';
import Bar from './Bar.svelte';

export default function Foo($$renderer, $$props) {
	let x = $$props['x'];
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		$$renderer.push(`<button class="foo">foo</button> <p>foo x: ${$.escape(x)}</p> `);

		Bar($$renderer, {
			get x() {
				return x;
			},

			set x($$value) {
				x = $$value;
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
	$.bind_props($$props, { x });
}