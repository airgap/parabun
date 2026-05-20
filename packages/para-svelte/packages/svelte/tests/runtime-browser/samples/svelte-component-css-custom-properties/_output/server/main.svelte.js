import * as $ from 'svelte/internal/server';
import Slider1 from './Slider1.svelte';
import Slider2 from './Slider2.svelte';

export default function Main($$renderer, $$props) {
	let slider;
	let componentName = $.fallback($$props['componentName'], 'Slider1');

	$: slider = componentName === 'Slider1'
		? Slider1
		: componentName === 'Slider2' ? Slider2 : undefined;

	$.css_props(
		$$renderer,
		true,
		{
			'--rail-color': 'rgb(0, 0, 0)',
			'--track-color': 'rgb(255, 0, 0)'
		},
		() => {
			if (slider) {
				$$renderer.push('<!--[-->');
				slider($$renderer, { id: 'component1' });
				$$renderer.push('<!--]-->');
			} else {
				$$renderer.push('<!--[!-->');
				$$renderer.push('<!--]-->');
			}
		},
		true
	);

	$$renderer.push(` `);

	$.css_props(
		$$renderer,
		true,
		{
			'--rail-color': 'rgb(0, 255, 0)',
			'--track-color': 'rgb(0, 0, 255)'
		},
		() => {
			if (slider) {
				$$renderer.push('<!--[-->');
				slider($$renderer, { id: 'component2' });
				$$renderer.push('<!--]-->');
			} else {
				$$renderer.push('<!--[!-->');
				$$renderer.push('<!--]-->');
			}
		},
		true
	);

	$.bind_props($$props, { componentName });
}