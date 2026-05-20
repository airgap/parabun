import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];
	let bar = $$props['bar'];
	let unused = $$props['unused'];

	$$renderer.push(`<div${$.attr_class('', void 0, { 'foo': foo, 'bar': bar, 'unused': unused })}></div>`);
	$.bind_props($$props, { foo, bar, unused });
}