import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let show = $$props['show'];
	let fields = $$props['fields'];

	if (show) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(fields);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let field = each_array[$$index];

			$$renderer.push(`<span>${$.escape(field)}</span>`);
		}

		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { show, fields });
}