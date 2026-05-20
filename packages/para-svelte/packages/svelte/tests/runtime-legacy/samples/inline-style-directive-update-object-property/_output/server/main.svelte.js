import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let settings = { fontSize: 12, bg: 'green' };
	let modify = $.fallback($$props['modify'], false);

	$: if (modify) {
		settings.fontSize = 50;
	}

	$$renderer.push(`<p${$.attr_style(`background-color: ${$.stringify(settings.bg)}`, { 'font-size': `${$.stringify(settings.fontSize)}px` })}></p>`);
	$.bind_props($$props, { modify });
}