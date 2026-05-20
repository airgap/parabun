import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let numbers = $.fallback(
		$$props['numbers'],
		() => [
			{ a: 3, b: 4, children: [{ a: 5, b: 6 }, { a: 7, b: 8 }] },
			{ a: 9, b: 10, children: [{ a: 11, b: 12 }, { a: 13, b: 14 }] }
		],
		true
	);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(numbers);

	for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
		let { a, b, children } = each_array[$$index_1];
		const ab = a + b;

		$$renderer.push(`<b>${$.escape(ab)}</b> <!--[-->`);

		const each_array_1 = $.ensure_array_like(children);

		for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
			let { a, b } = each_array_1[$$index];
			const ab = a + b;

			$$renderer.push(`<u>${$.escape(ab)}</u>`);
		}

		$$renderer.push(`<!--]--> <i>${$.escape(ab)}</i>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { numbers });
}