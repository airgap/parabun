import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let sortById = $.fallback($$props['sortById'], true);

	let items = [
		{ id: 1, name: "item 1", value: 3 },
		{ id: 2, name: "item 2", value: 2 },
		{ id: 3, name: "item 3", value: 1 }
	];

	$: items = items.sort((a, b) => {
		return sortById ? a.id - b.id : a.value - b.value;
	});

	$$renderer.push(`<div><!--[-->`);

	const each_array = $.ensure_array_like(items);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		$$renderer.push(`<div>`);

		if (item.name) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<span class="name">${$.escape(item.name)}</span>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--> <span>something</span></div>`);
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { sortById });
}