import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let colours = $.fallback($$props['colours'], () => ['red', 'green', 'blue'], true);

	$$renderer.push(`<svg><!--[-->`);

	const each_array = $.ensure_array_like(colours);

	for (let i = 0, $$length = each_array.length; i < $$length; i++) {
		let colour = each_array[i];

		$$renderer.push(`<circle${$.attr('cx', i * 100)} cy="100" r="100"${$.attr('fill', colour)}></circle>`);
	}

	$$renderer.push(`<!--]--></svg>`);
	$.bind_props($$props, { colours });
}