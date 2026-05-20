import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	let promise = Promise.resolve();

	$$renderer.push(`<div class="a svelte-xyz"></div> `);

	$.await(
		$$renderer,
		promise,
		() => {
			$$renderer.push(`<div class="b svelte-xyz"></div>`);
		},
		(value) => {
			$$renderer.push(`<div class="c svelte-xyz"></div>`);
		}
	);

	$$renderer.push(`<!--]--> <div class="e svelte-xyz"></div>`);
}