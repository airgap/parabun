import * as $ from 'svelte/internal/server';

export default function Slider($$renderer, $$props) {
	let id = $$props['id'];

	$$renderer.push(`<div${$.attr('id', id)}><p class="svelte-1rw3d8j">Slider</p> <span class="svelte-1rw3d8j">Track</span></div>`);
	$.bind_props($$props, { id });
}