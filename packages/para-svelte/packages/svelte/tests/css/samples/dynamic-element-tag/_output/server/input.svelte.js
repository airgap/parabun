import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	let element = $.fallback($$props['element'], 'div');

	$.element($$renderer, element, () => {
		$$renderer.push(` class="svelte-xyz"`);
	});

	$$renderer.push(` <h2 class="svelte-xyz">`);

	$.element(
		$$renderer,
		element,
		() => {
			$$renderer.push(` class="svelte-xyz"`);
		},
		() => {
			$$renderer.push(`<b class="svelte-xyz">text</b>`);
		}
	);

	$$renderer.push(`</h2>`);
	$.bind_props($$props, { element });
}