import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let selected = $$props['selected'];

	$$renderer.push(`<p>selected: ${$.escape(selected)}</p> `);

	$$renderer.select({ value: selected }, ($$renderer) => {
		$$renderer.option({}, ($$renderer) => {
			$$renderer.push(`a`);
		});

		$$renderer.option({}, ($$renderer) => {
			$$renderer.push(`b`);
		});

		$$renderer.option({}, ($$renderer) => {
			$$renderer.push(`c`);
		});
	});

	$$renderer.push(` <p>selected: ${$.escape(selected)}</p>`);
	$.bind_props($$props, { selected });
}