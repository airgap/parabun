import * as $ from 'svelte/internal/server';

export default function Foo($$renderer, $$props) {
	let foo = $$props['foo'];

	$.head('n5114s', $$renderer, ($$renderer) => {
		$$renderer.push(`${$.html(foo)}`);
	});

	$.bind_props($$props, { foo });
}