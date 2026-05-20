import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let items;

	function fn(value) {
		return true;
	}

	$: items = [{ value: 'hello' }];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(items.filter(fn));

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		$$renderer.push(`<input${$.attr('value', item.value)}/>`);
	}

	$$renderer.push(`<!--]-->`);
}