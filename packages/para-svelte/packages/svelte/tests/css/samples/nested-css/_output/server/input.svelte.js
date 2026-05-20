import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div class="a svelte-xyz"><div class="a svelte-xyz"></div> <div class="b svelte-xyz"><div class="c svelte-xyz"></div></div> <div class="d svelte-xyz"></div></div> <div class="container svelte-xyz"><div class="a svelte-xyz"></div></div>`);
}