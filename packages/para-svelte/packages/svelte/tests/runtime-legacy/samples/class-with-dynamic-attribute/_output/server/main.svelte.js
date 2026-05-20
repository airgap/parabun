import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let myClass = $$props['myClass'];

	$$renderer.push(`<div${$.attr_class($.clsx(myClass), void 0, { 'three': true })}></div>`);
	$.bind_props($$props, { myClass });
}