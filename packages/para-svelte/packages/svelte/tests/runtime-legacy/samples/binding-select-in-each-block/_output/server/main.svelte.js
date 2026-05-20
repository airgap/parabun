import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let items = $$props['items'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(items);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		$$renderer.select({ value: item.value }, ($$renderer) => {
			$$renderer.option({ value: 'hullo' }, ($$renderer) => {
				$$renderer.push(`Hullo`);
			});

			$$renderer.option({ value: 'world' }, ($$renderer) => {
				$$renderer.push(`World`);
			});
		});
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { items });
}