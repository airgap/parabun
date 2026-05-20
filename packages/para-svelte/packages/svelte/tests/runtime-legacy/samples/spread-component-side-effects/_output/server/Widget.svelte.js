import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let i = $$props['i'];
	let foo = $$props['foo'];
	let qux = $$props['qux'];

	$$renderer.push(`<p>i: ${$.escape(i)}</p> <p>foo: ${$.escape(foo)}</p> <p>qux: ${$.escape(qux)}</p>`);
	$.bind_props($$props, { i, foo, qux });
}