import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let color = $.fallback($$props['color'], 'red');

	$$renderer.push(`<div${$.attr_style(`color: ${$.stringify(color)};`)}>${$.escape(color)}</div>`);
	$.bind_props($$props, { color });
}