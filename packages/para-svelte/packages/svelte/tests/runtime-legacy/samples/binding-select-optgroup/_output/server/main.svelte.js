import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let name = $$props['name'];

	$$renderer.push(`<h1>Hello ${$.escape(name)}!</h1> `);

	$$renderer.select({ value: name }, ($$renderer) => {
		$$renderer.option({ value: 'Harry' }, ($$renderer) => {
			$$renderer.push(`Harry`);
		});

		$$renderer.push(`<optgroup label="Group">`);

		$$renderer.option({ value: 'World' }, ($$renderer) => {
			$$renderer.push(`World`);
		});

		$$renderer.push(`</optgroup>`);
	});

	$.bind_props($$props, { name });
}