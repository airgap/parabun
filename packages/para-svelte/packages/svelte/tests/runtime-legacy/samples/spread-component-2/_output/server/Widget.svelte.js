import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let foo = $$props['foo'];
	let baz = $$props['baz'];
	let qux = $$props['qux'];
	let quux = $$props['quux'];
	let selected = $$props['selected'];

	$$renderer.push(`<p>foo: ${$.escape(foo)}</p> <p>baz: ${$.escape(baz)} (${$.escape(typeof baz)})</p> <p>qux: ${$.escape(qux)}</p> <p>quux: ${$.escape(quux)}</p> <p>selected: ${$.escape(selected)}</p>`);
	$.bind_props($$props, { foo, baz, qux, quux, selected });
}