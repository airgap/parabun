import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let item = $$props['item'];

		$$renderer.push(`<select>`);

		$$renderer.option({ value: item.key }, ($$renderer) => {
			$$renderer.push(`${$.escape(item.name)}`);
		});

		$$renderer.option({ value: 'b' }, ($$renderer) => {
			$$renderer.push(`Two`);
		});

		$$renderer.option({ value: 'c' }, ($$renderer) => {
			$$renderer.push(`Three`);
		});

		$$renderer.push(`</select>`);
		$.bind_props($$props, { item });
	});
}