import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let selected = $$props['selected'];
	let items = $.fallback($$props['items'], () => ['a', 'b', 'c'], true);

	$$renderer.push(`<p>selected: ${$.escape(selected)}</p> `);

	$$renderer.select({ value: selected }, ($$renderer) => {
		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(items);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let letter = each_array[$$index];

			$$renderer.option({}, letter);
		}

		$$renderer.push(`<!--]-->`);
	});

	$.bind_props($$props, { selected, items });
}