import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	let things = $$props['things'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(things);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let thing = each_array[$$index];

		$$renderer.push(`<div></div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { things });
}