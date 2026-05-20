import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<h1 class="svelte-xyz">Hello!</h1> <div class="svelte-xyz"><span>World!</span></div> <!--[-->`);

	const each_array = $.ensure_array_like([]);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let _ = each_array[$$index];

		$$renderer.push(`<p class="svelte-xyz"></p>`);
	}

	$$renderer.push(`<!--]-->`);
}