import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<p class="foo svelte-xyz">this is styled</p> <p class="bar">this is unstyled</p>`);
}