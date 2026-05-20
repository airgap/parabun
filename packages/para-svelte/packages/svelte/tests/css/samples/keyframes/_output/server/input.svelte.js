import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div class="animated svelte-xyz">animated</div> <div class="also-animated svelte-xyz">also animated</div>`);
}