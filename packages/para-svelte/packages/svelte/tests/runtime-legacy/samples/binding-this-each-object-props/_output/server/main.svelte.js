import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const items1 = {};
	const items2 = {};
	let data = $.fallback($$props['data'], () => [{ id: 1, text: "b" }, { id: 2, text: "c" }], true);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(data);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		$$renderer.push(`<div>${$.escape(item.text)}</div> <div>${$.escape(item.text)}</div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { data, items1, items2 });
}