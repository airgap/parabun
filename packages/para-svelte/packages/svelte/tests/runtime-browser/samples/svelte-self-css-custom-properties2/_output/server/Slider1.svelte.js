import * as $ from 'svelte/internal/server';

export default function Slider1($$renderer, $$props) {
	let id = $$props['id'];
	let count = $.fallback($$props['count'], 0);

	$$renderer.push(`<div${$.attr('id', id)}><p class="svelte-12osliv">Slider1</p> <span class="svelte-12osliv">Track</span></div> `);

	if (count === 0) {
		$$renderer.push('<!--[0-->');

		$.css_props(
			$$renderer,
			true,
			{
				'--rail-color': 'rgb(255, 255, 0)',
				'--track-color': 'rgb(255, 0, 255)'
			},
			() => {
				Slider1($$renderer, { id: `nest-${$.stringify(id)}`, count: 1 });
			}
		);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { id, count });
}