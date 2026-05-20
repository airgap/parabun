import * as $ from 'svelte/internal/server';
import Svg from './Svg.svelte';

export default function Main($$renderer, $$props) {
	let rectColor1 = $$props['rectColor1'];
	let rectColor2 = $$props['rectColor2'];
	let circleColor1 = $$props['circleColor1'];
	let circleColor2 = $$props['circleColor2'];

	function identity(color) {
		return color;
	}

	$$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg">`);

	$.css_props($$renderer, false, { '--rect-color': rectColor1, '--circle-color': circleColor1 }, () => {
		Svg($$renderer, { id: 'svg-1' });
	});

	$.css_props(
		$$renderer,
		false,
		{
			'--rect-color': rectColor2,
			'--circle-color': identity(circleColor2)
		},
		() => {
			Svg($$renderer, { id: 'svg-2' });
		}
	);

	$$renderer.push(`</svg>`);
	$.bind_props($$props, { rectColor1, rectColor2, circleColor1, circleColor2 });
}