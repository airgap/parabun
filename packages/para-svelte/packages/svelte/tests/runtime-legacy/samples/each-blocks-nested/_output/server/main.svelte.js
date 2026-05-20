import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let columns = $$props['columns'];
	let rows = $$props['rows'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(columns);

	for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
		let x = each_array[$$index_1];

		$$renderer.push(`<!--[-->`);

		const each_array_1 = $.ensure_array_like(rows);

		for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
			let y = each_array_1[$$index];

			$$renderer.push(`<div>${$.escape(x)}, ${$.escape(y)}</div>`);
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { columns, rows });
}