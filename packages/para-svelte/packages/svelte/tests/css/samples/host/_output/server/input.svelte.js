import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<h1 class="svelte-xyz">Hello!</h1> <div class="svelte-xyz"><span class="svelte-xyz">World!</span></div>`);
}