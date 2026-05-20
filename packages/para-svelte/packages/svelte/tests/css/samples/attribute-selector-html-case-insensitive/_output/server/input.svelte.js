import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<form method="GET" class="svelte-xyz"><h1 class="svelte-xyz">Hello</h1></form> <form method="POST" class="svelte-xyz"><h1 class="svelte-xyz">World</h1></form> <input type="Text" class="svelte-xyz"/>`);
}