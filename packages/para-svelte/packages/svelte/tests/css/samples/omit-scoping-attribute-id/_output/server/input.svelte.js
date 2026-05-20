import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div id="foo" class="svelte-xyz"></div> <div id="bar"></div>`);
}