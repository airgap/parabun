import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let foo = $$props['foo'];
	let baz = $$props['baz'];
	let qux = $$props['qux'];

	$$renderer.push(`<p>foo: ${$.escape(foo)}</p> <p>baz: ${$.escape(baz)}</p> <p>qux: ${$.escape(qux)}</p>`);
	$.bind_props($$props, { foo, baz, qux });
}