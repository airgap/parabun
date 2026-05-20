import * as $ from 'svelte/internal/server';
import Item from './Item.svelte';

export default function List($$renderer, $$props) {
	let items = $.fallback($$props['items'], () => [3, 2, 1], true);

	function update() {
		items = [1, 2, 3, 4, 5];
	}

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(items);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		Item($$renderer, { item });
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { items, update });
}