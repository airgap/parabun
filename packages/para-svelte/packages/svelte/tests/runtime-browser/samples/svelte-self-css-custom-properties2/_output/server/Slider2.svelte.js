import * as $ from 'svelte/internal/server';

export default function Slider2($$renderer, $$props) {
	let id = $$props['id'];
	let count = $.fallback($$props['count'], 0);

	$$renderer.push(`<div${$.attr('id', id)}><p class="svelte-n89ytm">Slider2</p> <span class="svelte-n89ytm">Track</span></div> `);

	if (count === 0) {
		$$renderer.push('<!--[0-->');

		$.css_props(
			$$renderer,
			true,
			{
				'--rail-color': 'rgb(0, 255, 255)',
				'--track-color': 'rgb(255, 255, 255)'
			},
			() => {
				Slider2($$renderer, { id: `nest-${$.stringify(id)}`, count: 1 });
			}
		);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { id, count });
}