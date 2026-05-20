import * as $ from 'svelte/internal/server';
import Green from './Green.svelte';
import Red from './Red.svelte';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];
	let foo = $$props['foo'];
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		if (x ? Green : Red) {
			$$renderer.push('<!--[-->');

			(x ? Green : Red)($$renderer, {
				get foo() {
					return foo;
				},

				set foo($$value) {
					foo = $$value;
					$$settled = false;
				}
			});

			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { x, foo });
}