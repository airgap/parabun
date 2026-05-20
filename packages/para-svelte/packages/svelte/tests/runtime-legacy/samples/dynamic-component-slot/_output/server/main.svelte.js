import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';
import Bar from './Bar.svelte';
import Baz from './Baz.svelte';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];
	let tag = $.fallback($$props['tag'], 'you\'re it');
	let foo = $$props['foo'];
	let bar = $$props['bar'];
	let things = $.fallback($$props['things'], () => ['a', 'b', 'c'], true);

	if (x ? Foo : Bar) {
		$$renderer.push('<!--[-->');

		(x ? Foo : Bar)($$renderer, {
			x,
			children: ($$renderer) => {
				$$renderer.push(`<p>element</p> ${$.escape(tag)} `);

				if (foo) {
					$$renderer.push('<!--[0-->');
					$$renderer.push(`<p>foo</p>`);
				} else if (bar) {
					$$renderer.push('<!--[1-->');
					$$renderer.push(`<p>bar</p>`);
				} else {
					$$renderer.push('<!--[-1-->');
					$$renderer.push(`<p>neither foo nor bar</p>`);
				}

				$$renderer.push(`<!--]--> text <!--[-->`);

				const each_array = $.ensure_array_like(things);

				for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
					let thing = each_array[$$index];

					$$renderer.push(`<span>${$.escape(thing)}</span>`);
				}

				$$renderer.push(`<!--]--> `);
				Baz($$renderer, {});
				$$renderer.push(`<!---->`);
			},

			$$slots: {
				default: true,
				other: ($$renderer) => {
					$$renderer.push(`<div slot="other">what goes up must come down</div>`);
				}
			}
		});

		$$renderer.push('<!--]-->');
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push('<!--]-->');
	}

	$.bind_props($$props, { x, tag, foo, bar, things });
}