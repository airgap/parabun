import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';
import Bar from './Bar.svelte';

export default function Main($$renderer, $$props) {
	let a = $.fallback($$props['a'], true);
	let x = $$props['x'];
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		if (a ? Foo : Bar) {
			$$renderer.push('<!--[-->');

			(a ? Foo : Bar)($$renderer, {
				get x() {
					return x;
				},

				set x($$value) {
					x = $$value;
					$$settled = false;
				}
			});

			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}

		$$renderer.push(` <p>x in parent: ${$.escape(x)}</p>`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { a, x });
}