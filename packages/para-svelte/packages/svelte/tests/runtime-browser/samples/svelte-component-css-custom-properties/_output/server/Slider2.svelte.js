import * as $ from 'svelte/internal/server';

export default function Slider2($$renderer, $$props) {
	let id = $$props['id'];

	$$renderer.push(`<div${$.attr('id', id)}><p class="svelte-o4v715">Slider2</p> <span class="svelte-o4v715">Track</span></div>`);
	$.bind_props($$props, { id });
}