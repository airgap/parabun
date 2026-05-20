import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let options = [1, 2, 3];
		let selected = $.fallback($$props['selected'], () => [[1, 2, 3]], true);

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(options);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let value = each_array[$$index];

			$$renderer.push(`<label><input type="checkbox"${$.attr('checked', selected[0].includes(value), true)}${$.attr('value', value)}/> ${$.escape(value)}</label>`);
		}

		$$renderer.push(`<!--]--> <p>${$.escape(selected[0].join(', '))}</p>`);
		$.bind_props($$props, { selected });
	});
}