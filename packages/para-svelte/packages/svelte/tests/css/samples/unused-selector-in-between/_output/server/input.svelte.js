import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<h1 class="svelte-xyz">h1</h1> <h2 class="svelte-xyz">h2</h2> <h3 class="svelte-xyz">h3</h3> <p class="svelte-xyz">p</p>`);
}