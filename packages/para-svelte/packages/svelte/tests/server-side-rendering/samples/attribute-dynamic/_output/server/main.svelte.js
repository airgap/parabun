import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let font = $$props['font'];
	let color = $$props['color'];

	$$renderer.push(`<div${$.attr_style(`font-family: ${$.stringify(font)}; color: ${$.stringify(color)};`)}>${$.escape(color)} ${$.escape(font)}</div>`);
	$.bind_props($$props, { font, color });
}