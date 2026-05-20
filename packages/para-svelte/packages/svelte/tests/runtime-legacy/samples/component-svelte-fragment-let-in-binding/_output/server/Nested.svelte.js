import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let items = $$props['items'];

	$$renderer.push(`<div><!--[-->`);

	const each_array = $.ensure_array_like(items);

	for (let index = 0, $$length = each_array.length; index < $$length; index++) {
		let item = each_array[index];

		$$renderer.push(`<!--[-->`);
		$.slot($$renderer, $$props, 'main', { index }, null);
		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { items });
}