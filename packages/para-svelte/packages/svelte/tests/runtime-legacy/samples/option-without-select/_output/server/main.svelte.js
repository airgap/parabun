import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];

	$$renderer.option({ value: foo }, ($$renderer) => {
		$$renderer.push(`${$.escape(foo)}`);
	});

	$.bind_props($$props, { foo });
}