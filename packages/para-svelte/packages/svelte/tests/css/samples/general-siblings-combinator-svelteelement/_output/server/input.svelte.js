import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	let tag = 'div';

	$$renderer.push(`<div><p class="before svelte-xyz">before</p> `);

	$.element($$renderer, tag, () => {
		$$renderer.push(` class="x svelte-xyz"`);
	});

	$$renderer.push(` <p class="foo svelte-xyz"><span class="svelte-xyz">foo</span></p> <p class="bar svelte-xyz">bar</p></div> <!--[-->`);

	const each_array = $.ensure_array_like([1]);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		$.element($$renderer, tag, () => {
			$$renderer.push(` class="z svelte-xyz"`);
		});
	}

	$$renderer.push(`<!--]-->`);
}