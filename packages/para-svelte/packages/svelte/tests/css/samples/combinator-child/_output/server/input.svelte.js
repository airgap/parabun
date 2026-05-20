import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div class="test svelte-xyz"><div class="svelte-xyz">Testing...</div></div>`);
}