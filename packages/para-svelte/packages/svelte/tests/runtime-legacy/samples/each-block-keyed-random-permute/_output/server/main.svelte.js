import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let values = $$props['values'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(values);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let value = each_array[$$index];

		$$renderer.push(`<!---->(${$.escape(value.id)})`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { values });
}