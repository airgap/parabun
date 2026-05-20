import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<a class="svelte-xyz"><b class="svelte-xyz"><c class="svelte-xyz"><span class="svelte-xyz">Big red Comic Sans</span> <span class="foo svelte-xyz">Big red Comic Sans</span></c></b></a>`);
}