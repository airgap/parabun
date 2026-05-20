import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let array = $$props['array'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(array);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let {
			0: first,
			length,
			[length - 1]: last,
			[Math.floor(length / 2)]: half
		} = each_array[$$index];

		$$renderer.push(`<p>First: ${$.escape(first)}, Half: ${$.escape(half)}, Last: ${$.escape(last)}, Length: ${$.escape(length)}</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { array });
}