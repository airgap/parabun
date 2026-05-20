import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];
	const { bar } = foo;
	let baz = $$props['baz'];

	$$renderer.push(`<h1>${$.escape(bar)}</h1>`);
	$.bind_props($$props, { foo, baz });
}