import * as $ from 'svelte/internal/server';

export default function Slider($$renderer, $$props) {
	let id = $$props['id'];
	let count = $.fallback($$props['count'], 0);
	let railColor1 = $$props['railColor1'];
	let trackColor1 = $$props['trackColor1'];

	$$renderer.push(`<div${$.attr('id', id)}><p class="svelte-7ren2a">Slider</p> <span class="svelte-7ren2a">Track</span></div> `);

	if (count === 0) {
		$$renderer.push('<!--[0-->');

		$.css_props($$renderer, true, { '--rail-color': railColor1, '--track-color': trackColor1 }, () => {
			Slider($$renderer, { id: `nest-${$.stringify(id)}`, count: count + 1 });
		});
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { id, count, railColor1, trackColor1 });
}