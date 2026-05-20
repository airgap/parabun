import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	let array = [1];

	$$renderer.push(`<div class="svelte-xyz"></div> <!--[-->`);

	const each_array = $.ensure_array_like(array);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let item = each_array[$$index];

		$$renderer.push(`<span class="each svelte-xyz"></span> <div class="each svelte-xyz"></div> <span class="each svelte-xyz"></span> <div class="each svelte-xyz"></div>`);
	}

	$$renderer.push(`<!--]--> <span class="svelte-xyz"></span>`);
}