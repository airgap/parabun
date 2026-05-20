import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];
	let items = $$props['items'];

	$$renderer.push(`<div><input${$.attr('value', foo)}/><p>${$.escape(foo)}</p></div> <!--[-->`);

	const each_array = $.ensure_array_like(items);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let bar = each_array[$$index];

		$$renderer.push(`<div><input${$.attr('value', bar)}/><p>${$.escape(bar)}</p></div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { foo, items });
}