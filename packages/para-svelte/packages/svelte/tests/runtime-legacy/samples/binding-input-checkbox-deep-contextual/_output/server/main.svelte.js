import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let items = $$props['items'];
		let numCompleted = $$props['numCompleted'];

		$: numCompleted = items.reduce(
			(total, item) => {
				return total + (item.completed ? 1 : 0);
			},
			0
		);

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(items);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];

			$$renderer.push(`<div><input type="checkbox"${$.attr('checked', item.completed, true)}/><p>${$.escape(item.description)}</p></div>`);
		}

		$$renderer.push(`<!--]--> <p>${$.escape(numCompleted)} completed</p>`);
		$.bind_props($$props, { items, numCompleted });
	});
}