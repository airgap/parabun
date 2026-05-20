import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let myColor = $.fallback($$props['myColor'], "red");

	$$renderer.push(`<p${$.attr_style('', { '--border-color': myColor })}></p>`);
	$.bind_props($$props, { myColor });
}