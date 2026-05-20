import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$.element($$renderer, "div", () => {
		$$renderer.push(` class="used svelte-xyz"`);
	});
}