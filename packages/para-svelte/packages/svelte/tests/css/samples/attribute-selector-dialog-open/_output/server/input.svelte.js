import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<dialog class="svelte-xyz">Hello</dialog>`);
}