import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];
	let values = $$props['values'];

	$$renderer.select({ value: foo }, ($$renderer) => {
		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(values);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let v = each_array[$$index];

			$$renderer.option({}, v);
		}

		$$renderer.push(`<!--]-->`);
	});

	$$renderer.push(` <p>foo: ${$.escape(foo)}</p>`);
	$.bind_props($$props, { foo, values });
}