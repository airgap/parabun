import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let selected = $$props['selected'];
		let values = $$props['values'];

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(values);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let value = each_array[$$index];

			$$renderer.push(`<label><input type="radio"${$.attr('value', value)}${$.attr('checked', selected === value, true)}/> ${$.escape(value.name)}</label>`);
		}

		$$renderer.push(`<!--]--> <p>${$.escape(selected.name)}</p>`);
		$.bind_props($$props, { selected, values });
	});
}