import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];
	let bar = $$props['bar'];

	$$renderer.push(`<svg><!--[-->`);

	const each_array = $.ensure_array_like(foo);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let x = each_array[$$index];

		$$renderer.push(`<g class="foo"></g>`);
	}

	$$renderer.push(`<!--]--><!--[-->`);

	const each_array_1 = $.ensure_array_like(bar);

	for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
		let y = each_array_1[$$index_1];

		$$renderer.push(`<g class="bar"></g>`);
	}

	$$renderer.push(`<!--]--></svg>`);
	$.bind_props($$props, { foo, bar });
}