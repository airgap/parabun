import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let selected = $$props['selected'];

		$$renderer.select({ multiple: true, value: selected }, ($$renderer) => {
			$$renderer.option({}, ($$renderer) => {
				$$renderer.push(`one`);
			});

			$$renderer.option({}, ($$renderer) => {
				$$renderer.push(`two`);
			});

			$$renderer.option({}, ($$renderer) => {
				$$renderer.push(`three`);
			});
		});

		$$renderer.push(` <p>selected: ${$.escape(selected.join(', '))}</p>`);
		$.bind_props($$props, { selected });
	});
}