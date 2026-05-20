import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let foo = $$props['foo'];
	let baz = $$props['baz'];

	$$renderer.push(`<p>foo: ${$.escape(foo)}</p> <p>baz: ${$.escape(baz)} (${$.escape(typeof baz)})</p>`);
	$.bind_props($$props, { foo, baz });
}