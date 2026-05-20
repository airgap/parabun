import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let selected = $$props['selected'];

	$$renderer.push(`<p>selected: ${$.escape(selected)}</p> `);

	$$renderer.select({ value: selected }, ($$renderer) => {
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

	$$renderer.push(` <p>selected: ${$.escape(selected)}</p>`);
	$.bind_props($$props, { selected });
}