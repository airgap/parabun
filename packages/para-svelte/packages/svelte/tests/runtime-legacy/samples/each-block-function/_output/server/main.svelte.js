import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let numbers = $.fallback($$props['numbers'], () => [1, 2, 3], true);

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(numbers);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let i = each_array[$$index];

			$$renderer.push(`<p>${$.escape(numbers.map((j) => i * j).join(', '))}</p>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { numbers });
	});
}