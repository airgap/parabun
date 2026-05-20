import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	let promise = Promise.resolve();

	$$renderer.push(`<div class="a svelte-xyz"></div> `);

	$.await($$renderer, promise, () => {}, (value) => {
		$$renderer.push(`<div class="b svelte-xyz"></div>`);
	});

	$$renderer.push(`<!--]--> `);

	$.await(
		$$renderer,
		promise,
		() => {
			$$renderer.push(`<div class="d svelte-xyz"></div>`);
		},
		() => {}
	);

	$$renderer.push(`<!--]--> `);

	$.await(
		$$renderer,
		promise,
		() => {
			$$renderer.push(`<div class="f svelte-xyz"></div>`);
		},
		(error) => {
			$$renderer.push(`<div class="g svelte-xyz"></div>`);
		}
	);

	$$renderer.push(`<!--]--> <div class="h svelte-xyz"></div>`);
}