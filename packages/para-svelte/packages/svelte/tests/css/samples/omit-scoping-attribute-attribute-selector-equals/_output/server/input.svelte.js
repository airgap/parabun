import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div><p data-foo="bar" class="svelte-xyz">this is styled</p> <p data-foo="baz">this is unstyled</p></div>`);
}