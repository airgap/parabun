import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let array;

	$: {
		// test that this doesn't rerun on array change
		array = [];

		array[0] = [false, false];
		array[1] = [false, false];
	}

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(array);

	for (let i = 0, $$length = each_array.length; i < $$length; i++) {
		let row = each_array[i];

		$$renderer.push(`<!--[-->`);

		const each_array_1 = $.ensure_array_like(row);

		for (let j = 0, $$length = each_array_1.length; j < $$length; j++) {
			let item = each_array_1[j];

			$$renderer.push(`<button>${$.escape(item)}</button>`);
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]-->`);
}