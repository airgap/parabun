import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<span${$.attr_class('svelte-xyz', void 0, { 'foo': true })}></span> <div class="svelte-xyz"${$.attr_style('', { '--foo': 'bar' })}></div>`);
}