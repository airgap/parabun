import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';
import Bar from './Bar.svelte';
import Baz from './Baz.svelte';

export default function Main($$renderer, $$props) {
	let y = $$props['y'];
	let x = $$props['x'];
	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		$$renderer.push(`<p>y: ${$.escape(y)}</p> `);

		Baz($$renderer, {
			get x() {
				return x;
			},

			set x($$value) {
				x = $$value;
				$$settled = false;
			}
		});

		$$renderer.push(`<!----> `);

		if (x) {
			$$renderer.push('<!--[0-->');

			Foo($$renderer, {
				get y() {
					return y;
				},

				set y($$value) {
					y = $$value;
					$$settled = false;
				}
			});
		} else {
			$$renderer.push('<!--[-1-->');

			Bar($$renderer, {
				get y() {
					return y;
				},

				set y($$value) {
					y = $$value;
					$$settled = false;
				}
			});
		}

		$$renderer.push(`<!--]-->`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
	$.bind_props($$props, { y, x });
}