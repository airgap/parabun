import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let fruits = $$props['fruits'];

	$$renderer.push(`<div>`);

	if (fruits) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(fruits);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let fruit = each_array[$$index];

			$$renderer.push(`<div>${$.escape(fruit)}</div>`);
		}

		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { fruits });
}