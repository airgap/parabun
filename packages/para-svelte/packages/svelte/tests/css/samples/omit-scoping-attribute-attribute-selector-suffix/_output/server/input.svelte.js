import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div><p data-foo="barbaz">this is unstyled</p> <p data-foo="bazbar" class="svelte-xyz">this is styled</p></div>`);
}