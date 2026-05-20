import * as $ from 'svelte/internal/server';

function a($$renderer) {
	b($$renderer);
	$$renderer.push(`<!----> <div class="svelte-xyz">`);
	b($$renderer);
	$$renderer.push(`<!----></div>`);
}

function b($$renderer) {
	a($$renderer);
	$$renderer.push(`<!----> <div class="svelte-xyz">`);
	a($$renderer);
	$$renderer.push(`<!----></div>`);
}

function c($$renderer) {
	$$renderer.push(`<span class="svelte-xyz"></span> `);
	c($$renderer);
	$$renderer.push(`<!---->`);
}

export default function Input($$renderer) {}