import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const options = [1, 2, 3];
	let selected_array = $.fallback($$props['selected_array'], () => [[[1], [1, 2, 3]], [[2], [1]]], true);
	let selected_index = $.fallback($$props['selected_index'], () => [0, 1], true);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(selected_array);

	for (let $$index_2 = 0, $$length = each_array.length; $$index_2 < $$length; $$index_2++) {
		let selected = each_array[$$index_2];

		$$renderer.push(`<!--[-->`);

		const each_array_1 = $.ensure_array_like(selected_index);

		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let index = each_array_1[$$index_1];

			$$renderer.push(`<!--[-->`);

			const each_array_2 = $.ensure_array_like(options);

			for (let $$index = 0, $$length = each_array_2.length; $$index < $$length; $$index++) {
				let value = each_array_2[$$index];

				$$renderer.push(`<label><input type="checkbox"${$.attr('checked', selected[index].includes(value), true)}${$.attr('value', value)}/> ${$.escape(value)}</label>`);
			}

			$$renderer.push(`<!--]--> <p>${$.escape(selected[index].join(', '))}</p>`);
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { selected_array, selected_index });
}