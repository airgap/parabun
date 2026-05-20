import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], "font-size: 20px; color: blue;");
	let baz = "red"; // static value
	let bar = "32"; // static value interpolated
	let bg = $.fallback($$props['bg'], "gre" // dynamic value interpolated/cached
	);
	let borderColor = $.fallback($$props['borderColor'], "green" // dynamic value non-cached
	);

	$$renderer.push(`<p${$.attr_style(foo, {
		'font-size': `${$.stringify(bar)}px`,
		color: baz,
		'background-color': `${$.stringify(bg)}en`,
		'border-color': borderColor
	})}></p>`);

	$.bind_props($$props, { foo, bg, borderColor });
}