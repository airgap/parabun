import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let categories = $$props['categories'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(categories);

	for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
		let category = each_array[$$index_1];

		$$renderer.push(`<!--[-->`);

		const each_array_1 = $.ensure_array_like(category.things);

		for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
			let thing = each_array_1[$$index];

			$$renderer.push(`<p>${$.escape(category.name)}: ${$.escape(thing.name)}</p>`);
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { categories });
}