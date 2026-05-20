import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];
	let y = $$props['y'];
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		$$renderer.push(`<!---->${$.escape(y)}`);

		Foo($$renderer, {
			get x() {
				return y;
			},

			set x($$value) {
				y = $$value;
				$$settled = false;
			}
		});

		$$renderer.push(`<!---->${$.escape(y)}`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { x, y });
}