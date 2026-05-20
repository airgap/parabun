import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let selected = $$props['selected'];

	$$renderer.push(`<p>selected: ${$.escape(selected)}</p> `);

	$$renderer.select({ value: selected }, ($$renderer) => {
		$$renderer.option({ disabled: true }, ($$renderer) => {
			$$renderer.push(`x`);
		});

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(["a", "b", "c"]);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let val = each_array[$$index];

			$$renderer.option({}, val);
		}

		$$renderer.push(`<!--]-->`);
	});

	$.bind_props($$props, { selected });
}