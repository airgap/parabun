import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let myColor = $.fallback($$props['myColor'], "red");
	let width = $.fallback($$props['width'], "65px");
	let absolute = $.fallback($$props['absolute'], false);
	let bold = $.fallback($$props['bold'], true);

	$$renderer.push(`<p${$.attr_style('', {
		color: myColor,
		width,
		position: absolute ? "absolute" : null,
		'font-weight': bold ? 700 : 100
	})}></p>`);

	$.bind_props($$props, { myColor, width, absolute, bold });
}