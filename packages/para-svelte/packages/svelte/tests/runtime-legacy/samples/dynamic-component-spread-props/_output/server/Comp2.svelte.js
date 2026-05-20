import * as $ from 'svelte/internal/server';

export default function Comp2($$renderer, $$props) {
	let value = $$props['value'];
	let foo = $$props['foo'];
	let cb = $$props['cb'];

	$$renderer.push(`<p>value(2) = ${$.escape(value)}</p> <p>foo=${$.escape(foo)}</p> <p>typeof cb=${$.escape(typeof cb)}</p>`);
	$.bind_props($$props, { value, foo, cb });
}