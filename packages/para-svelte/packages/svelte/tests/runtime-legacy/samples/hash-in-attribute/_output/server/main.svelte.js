import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let links = $$props['links'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(links);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let link = each_array[$$index];

		$$renderer.push(`<a${$.attr('href', `x#${$.stringify(link)}`)}>x#${$.escape(link)}</a>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { links });
}