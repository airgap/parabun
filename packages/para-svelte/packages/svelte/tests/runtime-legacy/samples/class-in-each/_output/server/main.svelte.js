import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let things = $$props['things'];
	let selected = $$props['selected'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(things);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let thing = each_array[$$index];

		$$renderer.push(`<div${$.attr_class('', void 0, { 'selected': selected === thing })}></div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { things, selected });
}