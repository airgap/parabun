import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div><p data-foo="BAR" class="svelte-xyz">this is styled</p> <p data-foo="BAZ">this is unstyled</p></div>`);
}