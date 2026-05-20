import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let numbers = $.fallback($$props['numbers'], () => new Set([1, 2]), true);

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(numbers);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let i = each_array[$$index];

			$$renderer.push(`<p>${$.escape(i)}</p>`);
		}

		$$renderer.push(`<!--]--> <!--[-->`);

		const each_array_1 = $.ensure_array_like(numbers);

		for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
			let i = each_array_1[index];

			$$renderer.push(`<p>${$.escape(i)} ${$.escape(index)}</p>`);
		}

		$$renderer.push(`<!--]--> <!--[-->`);

		const each_array_2 = $.ensure_array_like(numbers);

		for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
			let i = each_array_2[index];

			$$renderer.push(`<p>${$.escape(i)} ${$.escape(index)}</p>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { numbers });
	});
}