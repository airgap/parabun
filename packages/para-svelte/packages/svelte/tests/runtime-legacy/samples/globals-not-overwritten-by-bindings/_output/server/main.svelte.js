import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let todos = $$props['todos'];

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(Object.keys(todos));

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let key = each_array[$$index];

			$$renderer.push(`<div${$.attr_class(`todo ${$.stringify(todos[key].done ? "done" : "")}`)}><input type="checkbox"${$.attr('checked', todos[key].done, true)}/> <input type="text"${$.attr('value', todos[key].description)}/></div>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { todos });
	});
}