import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div class="foo svelte-xyz"><div class="bar svelte-xyz"></div></div>`);
}