import * as $ from 'svelte/internal/server';
import InnerChild from './InnerChild.svelte';

export default function Child($$renderer, $$props) {
	let id = $.fallback($$props['id'], 1);
	let count = $$props['count'];
	let increment = $$props['increment'];
	let list;

	$: {
		list = [];

		for (let i = 0; i < count; ++i) {
			list.push(i);
		}
	}

	$$renderer.push(`<div${$.attr('data-id', id)}><!--[-->`);

	const each_array = $.ensure_array_like(list);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		InnerChild($$renderer, { val: item, increment });
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { id, count, increment });
}