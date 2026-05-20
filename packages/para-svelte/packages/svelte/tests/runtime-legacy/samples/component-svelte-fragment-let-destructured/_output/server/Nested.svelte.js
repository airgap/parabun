import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let things = $$props['things'];

	$$renderer.push(`<div><!--[-->`);

	const each_array = $.ensure_array_like(things);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let thing = each_array[$$index];

		$$renderer.push(`<!--[-->`);
		$.slot($$renderer, $$props, 'item', { thing }, null);
		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { things });
}