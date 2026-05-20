import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const options = [1, 2, 3];
	let selected_array_1 = $.fallback($$props['selected_array_1'], () => [[1], [2]], true);
	let selected_array_2 = $.fallback($$props['selected_array_2'], () => [[], [3]], true);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(selected_array_1);

	for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
		let selected = each_array[$$index_1];

		$$renderer.push(`<!--[-->`);

		const each_array_1 = $.ensure_array_like(options);

		for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
			let value = each_array_1[$$index];

			$$renderer.push(`<label><input type="checkbox"${$.attr('checked', selected.includes(value), true)}${$.attr('value', value)}/> ${$.escape(value)}</label>`);
		}

		$$renderer.push(`<!--]--> <p>${$.escape(selected.join(', '))}</p>`);
	}

	$$renderer.push(`<!--]--> <!--[-->`);

	const each_array_2 = $.ensure_array_like(selected_array_2);

	for (let $$index_3 = 0, $$length = each_array_2.length; $$index_3 < $$length; $$index_3++) {
		let selected = each_array_2[$$index_3];

		$$renderer.push(`<!--[-->`);

		const each_array_3 = $.ensure_array_like(options);

		for (let $$index_2 = 0, $$length = each_array_3.length; $$index_2 < $$length; $$index_2++) {
			let value = each_array_3[$$index_2];

			$$renderer.push(`<label><input type="checkbox"${$.attr('checked', selected.includes(value), true)}${$.attr('value', value)}/> ${$.escape(value)}</label>`);
		}

		$$renderer.push(`<!--]--> <p>${$.escape(selected.join(', '))}</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { selected_array_1, selected_array_2 });
}