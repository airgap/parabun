import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let ones = $$props['ones'];
	let twos = $$props['twos'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(ones);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let one = each_array[$$index];

		$$renderer.push(`<div>${$.escape(one.text)}</div>`);
	}

	$$renderer.push(`<!--]--> <!--[-->`);

	const each_array_1 = $.ensure_array_like(twos);

	for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
		let two = each_array_1[$$index_1];

		$$renderer.push(`<div>${$.escape(two.text)}</div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { ones, twos });
}