import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

export default function Main($$renderer, $$props) {
	let props = $.fallback($$props['props'], "dynamic");

	Component($$renderer, {
		children: ($$renderer) => {
			{
				const foo = "static";
				const bar = props;

				$$renderer.push(`<div>static ${$.escape(bar)}</div>`);
			}
		},

		$$slots: {
			default: true,
			box1: ($$renderer) => {
				{
					const foo = "static";
					const bar = props;

					$$renderer.push(`<div>static ${$.escape(bar)}</div>`);
				}
			}
		}
	});

	$$renderer.push(`<!----> `);

	Component($$renderer, {
		children: ($$renderer) => {
			const foo = "static";
			const bar = props;

			$$renderer.push(`<div>static ${$.escape(bar)}</div>`);
		},
		$$slots: { default: true }
	});

	$$renderer.push(`<!---->`);
	$.bind_props($$props, { props });
}