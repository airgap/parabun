import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let myColor = $.fallback($$props['myColor'], "red");

	$$renderer.push(`<div><p${$.attr_style('', { color: myColor })}></p></div>`);
	$.bind_props($$props, { myColor });
}