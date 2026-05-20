import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	let p = $$props['p'];
	let foo = $$props['foo'];
	let bar = $$props['bar'];
	let baz = $$props['baz'];
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		Foo($$renderer, {
			get bar() {
				return bar;
			},

			set bar($$value) {
				bar = $$value;
				$$settled = false;
			},

			get baz() {
				return baz;
			},

			set baz($$value) {
				baz = $$value;
				$$settled = false;
			}
		});

		$$renderer.push(`<!----> <p>${$.escape(bar + baz)}</p>`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { p, foo, bar, baz });
}