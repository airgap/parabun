import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let array = $$props['array'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(array);

	for (let i = 0, $$length = each_array.length; i < $$length; i++) {
		let row = each_array[i];

		$$renderer.push(`<div><!--[-->`);

		const each_array_1 = $.ensure_array_like(row);

		for (let j = 0, $$length = each_array_1.length; j < $$length; j++) {
			let cell = each_array_1[j];

			$$renderer.push(`<span>[ ${$.escape(i)}, ${$.escape(j)} ]</span>`);
		}

		$$renderer.push(`<!--]--></div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { array });
}