import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	let foo = false;
	let array = [1];

	$$renderer.push(`<div class="a svelte-xyz"></div> `);

	if (foo) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div class="b svelte-xyz"></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(array);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];

			$$renderer.push(`<div class="c svelte-xyz"></div>`);
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]--> <div class="d svelte-xyz"></div>`);
}