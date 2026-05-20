import * as $ from 'svelte/internal/server';

function foo($$renderer) {
	$$renderer.push(`<x class="svelte-xyz"><y class="svelte-xyz"></y></x>`);
}

export default function Input($$renderer) {
	foo($$renderer);
}