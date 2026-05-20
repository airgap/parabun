import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let color = $.fallback($$props['color'], 'red');

	$$renderer.push(`<p${$.attr_style('height: 40px;', { color })}></p>`);
	$.bind_props($$props, { color });
}