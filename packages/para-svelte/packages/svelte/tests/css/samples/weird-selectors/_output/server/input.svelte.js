import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div class="-foo svelte-xyz">foo</div> <div title="[" class="svelte-xyz">bar</div>`);
}