import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let array = $$props['array'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(array);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let [first, second, ...[third, ...{ length }]] = each_array[$$index];

		$$renderer.push(`<p>First: ${$.escape(first)}, Second: ${$.escape(second)}, Third: ${$.escape(third)}, Elements remaining: ${$.escape(length)}</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { array });
}