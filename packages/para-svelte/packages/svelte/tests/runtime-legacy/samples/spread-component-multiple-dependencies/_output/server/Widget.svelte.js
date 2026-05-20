import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let foo = $$props['foo'];
	let baz = $$props['baz'];

	$$renderer.push(`<!---->${$.escape(foo)} ${$.escape(baz)}`);
	$.bind_props($$props, { foo, baz });
}