import * as $ from 'svelte/internal/server';

function my_snippet($$renderer) {
	$$renderer.push(`<span class="svelte-xyz">Hello world</span>`);
}

export default function Input($$renderer) {
	function my_snippet($$renderer) {
		$$renderer.push(`<span class="svelte-xyz">Hello world</span>`);
	}

	$$renderer.push(`<div class="svelte-xyz">`);
	my_snippet($$renderer);
	$$renderer.push(`<!----></div> <p class="svelte-xyz"><strong>`);
	my_snippet($$renderer);
	$$renderer.push(`<!----></strong></p>`);
}