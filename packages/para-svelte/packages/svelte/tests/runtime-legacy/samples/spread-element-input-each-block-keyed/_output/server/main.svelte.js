import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let items = $.fallback($$props['items'], () => ['value1', 'value2'], true);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(items);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		$$renderer.push(`<input${$.attributes({ value: item, ...{} }, void 0, void 0, void 0, 4)}/>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { items });
}