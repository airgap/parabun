import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	let open = false;

	$$renderer.push(`<details${$.attr('open', open, true)} class="svelte-xyz">Hello</details>`);
}