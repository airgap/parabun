import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	let array = [1];

	$$renderer.push(`<div class="a svelte-xyz"></div> <!--[-->`);

	const each_array = $.ensure_array_like(array);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		$$renderer.push(`<div class="b svelte-xyz"></div> <div class="c svelte-xyz"></div>`);
	}

	$$renderer.push(`<!--]--> <div class="d svelte-xyz"></div>`);
}