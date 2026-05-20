import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let items = $$props['items'];
	let selected = $$props['selected'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(items);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		$$renderer.push(`<button>${$.escape(item)}</button>`);
	}

	$$renderer.push(`<!--]--> <p>selected: ${$.escape(selected)}</p>`);
	$.bind_props($$props, { items, selected });
}