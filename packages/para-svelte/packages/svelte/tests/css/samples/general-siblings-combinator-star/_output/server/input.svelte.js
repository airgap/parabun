import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div class="not-match"><div></div></div> <div class="match svelte-xyz"><div class="svelte-xyz"></div> <div class="svelte-xyz"></div></div>`);
}