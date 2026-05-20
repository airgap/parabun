import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div class="foo svelte-xyz">foo</div> <div class="bar svelte-xyz">bar</div>`);
}