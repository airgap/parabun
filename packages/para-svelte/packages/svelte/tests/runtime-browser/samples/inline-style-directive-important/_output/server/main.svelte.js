import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let color = $.fallback($$props['color'], 'red');

	$$renderer.push(`<h1 class="svelte-jgimfk"${$.attr_style('', { 'background-color': color })}>hello</h1> <h1 class="svelte-jgimfk"${$.attr_style('', [{}, { 'background-color': color }])}>hello</h1>`);
	$.bind_props($$props, { color });
}