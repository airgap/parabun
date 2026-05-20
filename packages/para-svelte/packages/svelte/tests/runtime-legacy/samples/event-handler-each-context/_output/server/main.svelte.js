import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let items = $$props['items'];
	let foo = $$props['foo'];
	let bar = $$props['bar'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(items);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		$$renderer.push(`<button>${$.escape(item)}</button>`);
	}

	$$renderer.push(`<!--]--> <p>foo: ${$.escape(foo)}</p>`);
	$.bind_props($$props, { items, foo, bar });
}