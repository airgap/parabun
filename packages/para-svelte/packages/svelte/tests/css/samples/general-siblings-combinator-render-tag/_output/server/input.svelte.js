import * as $ from 'svelte/internal/server';

function foo($$renderer) {
	$$renderer.push(`<p class="svelte-xyz">this should be green</p>`);
}

export default function Input($$renderer) {
	$$renderer.push(`<h1 class="svelte-xyz">Hello</h1> `);
	foo($$renderer);
	$$renderer.push(`<!---->`);
}