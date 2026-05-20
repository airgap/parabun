import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let names = $.fallback($$props['names'], () => ['John', 'Jill'], true);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(names);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let name = each_array[$$index];

		$$renderer.push(`${$.html(name)}`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { names });
}