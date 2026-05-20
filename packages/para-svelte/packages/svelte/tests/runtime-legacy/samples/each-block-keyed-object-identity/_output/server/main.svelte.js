import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let todos = $$props['todos'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(todos);

	for (let i = 0, $$length = each_array.length; i < $$length; i++) {
		let todo = each_array[i];

		$$renderer.push(`<p>${$.escape(i + 1)}: ${$.escape(todo.description)}</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { todos });
}