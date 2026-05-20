import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let items = $$props['items'];

	$$renderer.push(`<ul><!--[-->`);

	const each_array = $.ensure_array_like(items);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		if (item.id) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<li>${$.escape(item.name)}</li>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]--></ul>`);
	$.bind_props($$props, { items });
}