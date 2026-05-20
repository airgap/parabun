import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div class="svelte-xyz"><p class="svelte-xyz">${$.html(whatever)}</p></div>`);
}