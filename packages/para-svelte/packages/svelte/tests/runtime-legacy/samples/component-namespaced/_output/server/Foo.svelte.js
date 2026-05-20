import * as $ from 'svelte/internal/server';

export default function Foo($$renderer, $$props) {
	let foo = $$props['foo'];

	$$renderer.push(`<p>foo ${$.escape(foo)}</p>`);
	$.bind_props($$props, { foo });
}