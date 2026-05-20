import * as $ from 'svelte/internal/server';
import Slider from './Slider.svelte';

export default function Main($$renderer, $$props) {
	let railColor1 = $$props['railColor1'];
	let railColor2 = $$props['railColor2'];
	let trackColor1 = $$props['trackColor1'];
	let trackColor2 = $$props['trackColor2'];
	let nestRailColor1 = $$props['nestRailColor1'];
	let nestRailColor2 = $$props['nestRailColor2'];
	let nestTrackColor1 = $$props['nestTrackColor1'];
	let nestTrackColor2 = $$props['nestTrackColor2'];

	function identity(color) {
		return color;
	}

	$.css_props($$renderer, true, { '--rail-color': railColor1, '--track-color': trackColor1 }, () => {
		Slider($$renderer, {
			id: 'slider-1',
			railColor1: nestRailColor1,
			trackColor1: nestTrackColor1
		});
	});

	$$renderer.push(` `);

	$.css_props(
		$$renderer,
		true,
		{
			'--rail-color': railColor2,
			'--track-color': identity(trackColor2)
		},
		() => {
			if (Slider) {
				$$renderer.push('<!--[-->');

				Slider($$renderer, {
					id: 'slider-2',
					railColor1: nestRailColor2,
					trackColor1: nestTrackColor2
				});

				$$renderer.push('<!--]-->');
			} else {
				$$renderer.push('<!--[!-->');
				$$renderer.push('<!--]-->');
			}
		},
		true
	);

	$.bind_props($$props, {
		railColor1,
		railColor2,
		trackColor1,
		trackColor2,
		nestRailColor1,
		nestRailColor2,
		nestTrackColor1,
		nestTrackColor2
	});
}