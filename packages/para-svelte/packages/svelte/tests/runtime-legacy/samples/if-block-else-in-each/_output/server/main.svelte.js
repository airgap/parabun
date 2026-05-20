import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let array = $$props['array'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(array);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		if (item) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<div>foo</div>`);
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(`<div>bar</div>`);
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { array });
}