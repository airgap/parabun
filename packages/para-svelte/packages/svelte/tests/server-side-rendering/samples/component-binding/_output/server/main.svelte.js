import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		$$renderer.push(`<!---->${$.escape(x)}`);

		Foo($$renderer, {
			get x() {
				return x;
			},

			set x($$value) {
				x = $$value;
				$$settled = false;
			}
		});

		$$renderer.push(`<!---->${$.escape(x)}`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { x });
}