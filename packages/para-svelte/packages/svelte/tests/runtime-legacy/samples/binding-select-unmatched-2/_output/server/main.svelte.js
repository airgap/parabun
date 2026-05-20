import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	// set as null so no option will be selected by default
	let selected = $.fallback($$props['selected'], null);

	$$renderer.push(`<p>selected: ${$.escape(selected)}</p> `);

	$$renderer.select({ value: selected }, ($$renderer) => {
		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(['a', 'b', 'c']);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let letter = each_array[$$index];

			$$renderer.option({}, letter);
		}

		$$renderer.push(`<!--]-->`);
	});

	$$renderer.push(` <p>selected: ${$.escape(selected)}</p>`);
	$.bind_props($$props, { selected });
}