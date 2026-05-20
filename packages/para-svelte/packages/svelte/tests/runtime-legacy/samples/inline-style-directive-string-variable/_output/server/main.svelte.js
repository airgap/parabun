import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let translate_x = $.fallback($$props['translate_x'], "45px");
	let border_width = $.fallback($$props['border_width'], 100);
	let border_color = $$props['border_color'];

	$$renderer.push(`<p${$.attr_style('', {
		color: "green",
		transform: `translateX(${$.stringify(translate_x)})`,
		border: `${$.stringify(border_width)}px solid ${$.stringify(border_color || 'pink')}`
	})}></p>`);

	$.bind_props($$props, { translate_x, border_width, border_color });
}